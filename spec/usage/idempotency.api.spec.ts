import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify idempotent consumption and request conflicts
///////////////////////////////////////////////////////
describe("Usage idempotency", () => {
  it("counts an accepted request only once and returns its original record", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const body = {
        userId: user.id,
        requestId: randomUUID(),
        requestedUnits: 10,
      };

      const first = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send(body);

      const repeated = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send(body);

      expect(first.status).toBe(200);
      expect(first.body.status).toBe("accepted");
      expect(first.body.duplicate).toBeFalse();

      expect(repeated.status).toBe(200);
      expect(repeated.body).toEqual({
        ...first.body,
        duplicate: true,
      });

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
      expect(records.body.records[0].id).toBe(first.body.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("returns the original rejected decision even after the user upgrades", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const body = {
        userId: user.id,
        requestId: randomUUID(),
        requestedUnits: 11,
      };

      const first = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send(body);

      expect(first.status).toBe(200);
      expect(first.body.status).toBe("rejected");
      expect(first.body.rejectionReason).toBe("user_request_limit");
      expect(first.body.duplicate).toBeFalse();

      const premium = await getPremiumPlan();

      const upgraded = await request(app)
        .patch(`/api/users/${user.id}/plan`)
        .set("x-api-key", apiKey)
        .send({ planId: premium.id });

      expect(upgraded.status).toBe(200);

      const repeated = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send(body);

      expect(repeated.status).toBe(200);
      expect(repeated.body).toEqual({
        ...first.body,
        duplicate: true,
      });

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(0);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(0);

      const records = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(1);
      expect(records.body.records[0].id).toBe(first.body.id);

      const fresh = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          ...body,
          requestId: randomUUID(),
        });

      expect(fresh.status).toBe(200);
      expect(fresh.body.status).toBe("accepted");
      expect(fresh.body.duplicate).toBeFalse();
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects the same request ID with different units without changing usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const requestId = randomUUID();

      const first = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 5,
        });

      expect(first.status).toBe(200);
      expect(first.body.status).toBe("accepted");

      const conflict = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 6,
        });

      expect(conflict.status).toBe(409);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(5);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(5);

      const records = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(1);

      const original = await request(app)
        .get(`/api/usage/records/${first.body.id}`)
        .set("x-api-key", apiKey);

      expect(original.status).toBe(200);
      expect(original.body.requestedUnits).toBe(5);
      expect(original.body.status).toBe("accepted");
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects the same request ID for a different user without consuming again", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const firstUser = await createTestUser(account.id);
      const secondUser = await createTestUser(account.id);
      const requestId = randomUUID();

      const first = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: firstUser.id,
          requestId,
          requestedUnits: 5,
        });

      expect(first.status).toBe(200);
      expect(first.body.status).toBe("accepted");

      const conflict = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: secondUser.id,
          requestId,
          requestedUnits: 5,
        });

      expect(conflict.status).toBe(409);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const firstUserUsage = await request(app)
        .get(`/api/usage/users/${firstUser.id}`)
        .set("x-api-key", apiKey);

      const secondUserUsage = await request(app)
        .get(`/api/usage/users/${secondUser.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(5);

      expect(firstUserUsage.status).toBe(200);
      expect(firstUserUsage.body.usedUnits).toBe(5);

      expect(secondUserUsage.status).toBe(200);
      expect(secondUserUsage.body.usedUnits).toBe(0);

      const records = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(1);
      expect(records.body.records[0].userId).toBe(firstUser.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("allows the same request ID independently in different accounts", async () => {
    const first = await createTestAccount();

    try {
      const second = await createTestAccount();

      try {
        const firstUser = await createTestUser(first.account.id);
        const secondUser = await createTestUser(second.account.id);
        const requestId = randomUUID();

        const firstResponse = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", first.apiKey)
          .send({
            userId: firstUser.id,
            requestId,
            requestedUnits: 5,
          });

        const secondResponse = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", second.apiKey)
          .send({
            userId: secondUser.id,
            requestId,
            requestedUnits: 5,
          });

        expect(firstResponse.status).toBe(200);
        expect(firstResponse.body.status).toBe("accepted");
        expect(firstResponse.body.duplicate).toBeFalse();

        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body.status).toBe("accepted");
        expect(secondResponse.body.duplicate).toBeFalse();

        expect(firstResponse.body.id).not.toBe(secondResponse.body.id);

        const firstUsage = await request(app)
          .get("/api/usage/account")
          .set("x-api-key", first.apiKey);

        const secondUsage = await request(app)
          .get("/api/usage/account")
          .set("x-api-key", second.apiKey);

        expect(firstUsage.status).toBe(200);
        expect(firstUsage.body.usedUnits).toBe(5);

        expect(secondUsage.status).toBe(200);
        expect(secondUsage.body.usedUnits).toBe(5);

        const firstRecords = await request(app)
          .get("/api/usage/records")
          .set("x-api-key", first.apiKey);

        const secondRecords = await request(app)
          .get("/api/usage/records")
          .set("x-api-key", second.apiKey);

        expect(firstRecords.status).toBe(200);
        expect(firstRecords.body.pagination.total).toBe(1);
        expect(firstRecords.body.records[0].accountId).toBe(first.account.id);

        expect(secondRecords.status).toBe(200);
        expect(secondRecords.body.pagination.total).toBe(1);
        expect(secondRecords.body.records[0].accountId).toBe(second.account.id);
      } finally {
        await deleteTestAccount(second.account.id);
      }
    } finally {
      await deleteTestAccount(first.account.id);
    }
  });
});

///////////////////////////////////////////////////////
// Find the predefined Premium user plan
///////////////////////////////////////////////////////
async function getPremiumPlan() {
  const response = await request(app)
    .get("/api/plans")
    .query({ planType: "user" });

  if (response.status !== 200 || !Array.isArray(response.body)) {
    throw new Error("Failed to fetch public user plans");
  }

  const plan = response.body.find(
    (item: { name: string; id: string }) => item.name === "Premium",
  );

  if (!plan) {
    throw new Error("Premium user plan not found");
  }

  return plan;
}
