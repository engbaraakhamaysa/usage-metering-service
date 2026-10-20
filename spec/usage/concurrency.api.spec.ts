import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify consumption correctness under concurrent requests
///////////////////////////////////////////////////////
describe("Usage concurrency", () => {
  it("counts simultaneous copies of the same request only once", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const body = {
        userId: user.id,
        requestId: randomUUID(),
        requestedUnits: 10,
      };

      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(app)
            .post("/api/usage/consume")
            .set("x-api-key", apiKey)
            .send(body),
        ),
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("accepted");
        expect(response.body.requestId).toBe(body.requestId);
      }

      const originals = responses.filter(
        (response) => response.body.duplicate === false,
      );

      const duplicates = responses.filter(
        (response) => response.body.duplicate === true,
      );

      expect(originals.length).toBe(1);
      expect(duplicates.length).toBe(9);

      const recordIds = new Set(responses.map((response) => response.body.id));

      expect(recordIds.size).toBe(1);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(10);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(10);

      const records = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(1);
      expect(records.body.records.length).toBe(1);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("does not exceed the user monthly allowance under concurrent requests", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const responses = await Promise.all(
        Array.from({ length: 15 }, () =>
          request(app)
            .post("/api/usage/consume")
            .set("x-api-key", apiKey)
            .send({
              userId: user.id,
              requestId: randomUUID(),
              requestedUnits: 10,
            }),
        ),
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body.duplicate).toBeFalse();
      }

      const accepted = responses.filter(
        (response) => response.body.status === "accepted",
      );

      const rejected = responses.filter(
        (response) => response.body.status === "rejected",
      );

      expect(accepted.length).toBe(10);
      expect(rejected.length).toBe(5);

      for (const response of rejected) {
        expect(response.body.rejectionReason).toBe("user_monthly_limit");
      }

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(100);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(100);

      const records = await request(app)
        .get("/api/usage/records")
        .query({ limit: 100 })
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(15);
      expect(records.body.records.length).toBe(15);

      expect(records.body.records).toEqual(
        jasmine.arrayWithExactContents(
          responses.map((response) =>
            jasmine.objectContaining({
              id: response.body.id,
              requestId: response.body.requestId,
              status: response.body.status,
              requestedUnits: 10,
            }),
          ),
        ),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("does not exceed the shared account allowance across concurrent users", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const firstUser = await createTestUser(account.id, "Premium");
      const secondUser = await createTestUser(account.id, "Premium");

      const submissions = Array.from({ length: 16 }, (_, index) => ({
        userId: index % 2 === 0 ? firstUser.id : secondUser.id,
        requestId: randomUUID(),
        requestedUnits: 100,
      }));

      const responses = await Promise.all(
        submissions.map((body) =>
          request(app)
            .post("/api/usage/consume")
            .set("x-api-key", apiKey)
            .send(body),
        ),
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body.duplicate).toBeFalse();
      }

      const accepted = responses.filter(
        (response) => response.body.status === "accepted",
      );

      const rejected = responses.filter(
        (response) => response.body.status === "rejected",
      );

      expect(accepted.length).toBe(10);
      expect(rejected.length).toBe(6);

      for (const response of rejected) {
        expect(response.body.rejectionReason).toBe("account_monthly_limit");
      }

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const firstUsage = await request(app)
        .get(`/api/usage/users/${firstUser.id}`)
        .set("x-api-key", apiKey);

      const secondUsage = await request(app)
        .get(`/api/usage/users/${secondUser.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(1_000);

      expect(firstUsage.status).toBe(200);
      expect(secondUsage.status).toBe(200);

      const firstAcceptedUnits =
        accepted.filter((response) => response.body.userId === firstUser.id)
          .length * 100;

      const secondAcceptedUnits =
        accepted.filter((response) => response.body.userId === secondUser.id)
          .length * 100;

      expect(firstUsage.body.usedUnits).toBe(firstAcceptedUnits);
      expect(secondUsage.body.usedUnits).toBe(secondAcceptedUnits);

      expect(firstUsage.body.usedUnits + secondUsage.body.usedUnits).toBe(
        1_000,
      );

      const records = await request(app)
        .get("/api/usage/records")
        .query({ limit: 100 })
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(16);
      expect(records.body.records.length).toBe(16);

      expect(records.body.records).toEqual(
        jasmine.arrayWithExactContents(
          responses.map((response) =>
            jasmine.objectContaining({
              id: response.body.id,
              requestId: response.body.requestId,
              userId: response.body.userId,
              status: response.body.status,
              requestedUnits: 100,
            }),
          ),
        ),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
