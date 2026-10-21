import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify usage history pagination and ordering
///////////////////////////////////////////////////////
describe("Usage records pagination", () => {
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
});
