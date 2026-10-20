import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Query usage history and verify pagination and isolation
///////////////////////////////////////////////////////
describe("Usage records", () => {
  it("returns an empty history for a new account", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        records: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("includes accepted and rejected requests in history", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const accepted = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 5,
        });

      const rejected = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 11,
        });

      expect(accepted.status).toBe(200);
      expect(accepted.body.status).toBe("accepted");

      expect(rejected.status).toBe(200);
      expect(rejected.body.status).toBe("rejected");

      const response = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.pagination.total).toBe(2);

      expect(response.body.records).toEqual(
        jasmine.arrayWithExactContents([
          jasmine.objectContaining({
            id: accepted.body.id,
            status: "accepted",
            rejectionReason: null,
          }),
          jasmine.objectContaining({
            id: rejected.body.id,
            status: "rejected",
            rejectionReason: "user_request_limit",
          }),
        ]),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("paginates records without overlap and preserves their order", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const createdIds: string[] = [];

      for (let index = 0; index < 5; index++) {
        const response = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", apiKey)
          .send({
            userId: user.id,
            requestId: randomUUID(),
            requestedUnits: 1,
          });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("accepted");

        createdIds.push(response.body.id);
      }

      const all = await request(app)
        .get("/api/usage/records")
        .query({ limit: 100 })
        .set("x-api-key", apiKey);

      expect(all.status).toBe(200);
      expect(all.body.records.length).toBe(5);

      expect(all.body.records).toEqual(
        jasmine.arrayWithExactContents(
          createdIds.map((id) => jasmine.objectContaining({ id })),
        ),
      );

      // Check descending timestamps and descending IDs for ties.
      for (let index = 1; index < all.body.records.length; index++) {
        const previous = all.body.records[index - 1];
        const current = all.body.records[index];

        const previousTime = Date.parse(previous.createdAt);
        const currentTime = Date.parse(current.createdAt);

        expect(previousTime).toBeGreaterThanOrEqual(currentTime);

        if (previous.createdAt === current.createdAt) {
          expect(previous.id > current.id).toBeTrue();
        }
      }

      const pagedIds: string[] = [];

      for (let page = 1; page <= 3; page++) {
        const response = await request(app)
          .get("/api/usage/records")
          .query({ page, limit: 2 })
          .set("x-api-key", apiKey);

        expect(response.status).toBe(200);

        expect(response.body.pagination).toEqual({
          page,
          limit: 2,
          total: 5,
          totalPages: 3,
        });

        const expectedRecords = all.body.records.slice(
          (page - 1) * 2,
          page * 2,
        );

        expect(response.body.records).toEqual(expectedRecords);

        for (const record of response.body.records) {
          pagedIds.push(record.id);
        }
      }

      expect(pagedIds.length).toBe(5);
      expect(new Set(pagedIds).size).toBe(5);

      const beyondLastPage = await request(app)
        .get("/api/usage/records")
        .query({ page: 4, limit: 2 })
        .set("x-api-key", apiKey);

      expect(beyondLastPage.status).toBe(200);
      expect(beyondLastPage.body.records).toEqual([]);
      expect(beyondLastPage.body.pagination.total).toBe(5);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("does not expose another account's records", async () => {
    const owner = await createTestAccount();

    try {
      const other = await createTestAccount();

      try {
        const user = await createTestUser(owner.account.id);

        const consumed = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", owner.apiKey)
          .send({
            userId: user.id,
            requestId: randomUUID(),
            requestedUnits: 5,
          });

        expect(consumed.status).toBe(200);
        expect(consumed.body.status).toBe("accepted");

        const otherHistory = await request(app)
          .get("/api/usage/records")
          .set("x-api-key", other.apiKey);

        expect(otherHistory.status).toBe(200);
        expect(otherHistory.body.records).toEqual([]);
        expect(otherHistory.body.pagination.total).toBe(0);

        const forbidden = await request(app)
          .get(`/api/usage/records/${consumed.body.id}`)
          .set("x-api-key", other.apiKey);

        expect(forbidden.status).toBe(404);

        const ownedRecord = await request(app)
          .get(`/api/usage/records/${consumed.body.id}`)
          .set("x-api-key", owner.apiKey);

        expect(ownedRecord.status).toBe(200);
        expect(ownedRecord.body.id).toBe(consumed.body.id);
        expect(ownedRecord.body.accountId).toBe(owner.account.id);
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });

  it("returns 404 for a record that does not exist", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get(`/api/usage/records/${randomUUID()}`)
        .set("x-api-key", apiKey);

      expect(response.status).toBe(404);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects an invalid record ID format", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get("/api/usage/records/not-a-uuid")
        .set("x-api-key", apiKey);

      expect(response.status).toBe(400);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects invalid pagination values", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const invalidQueries = [
        { page: "0" },
        { page: "-1" },
        { page: "1.5" },
        { page: "abc" },
        { limit: "0" },
        { limit: "101" },
        { limit: "1.5" },
        { limit: "abc" },
      ];

      for (const query of invalidQueries) {
        const response = await request(app)
          .get("/api/usage/records")
          .query(query)
          .set("x-api-key", apiKey);

        expect(response.status).withContext(JSON.stringify(query)).toBe(400);
      }
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects history requests without an API key", async () => {
    const paths = ["/api/usage/records", `/api/usage/records/${randomUUID()}`];

    for (const path of paths) {
      const response = await request(app).get(path);

      expect(response.status).withContext(path).toBe(401);
    }
  });

  it("rejects history requests with an invalid API key", async () => {
    const paths = ["/api/usage/records", `/api/usage/records/${randomUUID()}`];

    for (const path of paths) {
      const response = await request(app)
        .get(path)
        .set("x-api-key", randomUUID());

      expect(response.status).withContext(path).toBe(401);
    }
  });
});
