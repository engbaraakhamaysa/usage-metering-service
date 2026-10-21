import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify repeated requests preserve the original decision
///////////////////////////////////////////////////////
describe("Usage idempotency replay", () => {
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
