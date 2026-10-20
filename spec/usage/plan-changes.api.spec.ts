import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify live plan changes without resetting usage
///////////////////////////////////////////////////////
describe("Usage after plan changes", () => {
  it("applies a user upgrade immediately without resetting usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const initial = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 10,
        });

      expect(initial.status).toBe(200);
      expect(initial.body.status).toBe("accepted");

      const beforeUpgrade = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 20,
        });

      expect(beforeUpgrade.status).toBe(200);
      expect(beforeUpgrade.body.rejectionReason).toBe("user_request_limit");

      const premium = await getPublicPlan("Premium", "user");

      const upgraded = await request(app)
        .patch(`/api/users/${user.id}/plan`)
        .set("x-api-key", apiKey)
        .send({ planId: premium.id });

      expect(upgraded.status).toBe(200);

      const preservedUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(preservedUsage.status).toBe(200);
      expect(preservedUsage.body.usedUnits).toBe(10);

      const afterUpgrade = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 20,
        });

      expect(afterUpgrade.status).toBe(200);
      expect(afterUpgrade.body.status).toBe("accepted");

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(30);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(30);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("applies an account upgrade without resetting shared usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const firstUser = await createTestUser(account.id, "Premium");
      const secondUser = await createTestUser(account.id, "Premium");

      for (let index = 0; index < 10; index++) {
        const consumed = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", apiKey)
          .send({
            userId: firstUser.id,
            requestId: randomUUID(),
            requestedUnits: 100,
          });

        expect(consumed.status).toBe(200);
        expect(consumed.body.status).toBe("accepted");
      }

      const exhausted = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: secondUser.id,
          requestId: randomUUID(),
          requestedUnits: 1,
        });

      expect(exhausted.status).toBe(200);
      expect(exhausted.body.rejectionReason).toBe("account_monthly_limit");

      const pro = await getPublicPlan("Pro", "account");

      const upgraded = await request(app)
        .patch("/api/accounts/me/plan")
        .set("x-api-key", apiKey)
        .send({ planId: pro.id });

      expect(upgraded.status).toBe(200);

      const preservedUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(preservedUsage.status).toBe(200);
      expect(preservedUsage.body.usedUnits).toBe(1_000);

      const afterUpgrade = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: secondUser.id,
          requestId: randomUUID(),
          requestedUnits: 1,
        });

      expect(afterUpgrade.status).toBe(200);
      expect(afterUpgrade.body.status).toBe("accepted");

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
      expect(accountUsage.body.usedUnits).toBe(1_001);

      expect(firstUsage.status).toBe(200);
      expect(firstUsage.body.usedUnits).toBe(1_000);

      expect(secondUsage.status).toBe(200);
      expect(secondUsage.body.usedUnits).toBe(1);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("applies private plan setting changes to the next request", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const created = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Live Settings Plan",
          planType: "user",
          monthlyAllowance: 100,
          maxUnitsPerRequest: 10,
        });

      expect(created.status).toBe(201);

      const assigned = await request(app)
        .patch(`/api/users/${user.id}/plan`)
        .set("x-api-key", apiKey)
        .send({ planId: created.body.id });

      expect(assigned.status).toBe(200);

      const initial = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 10,
        });

      expect(initial.status).toBe(200);
      expect(initial.body.status).toBe("accepted");

      const restricted = await request(app)
        .patch(`/api/plans/${created.body.id}`)
        .set("x-api-key", apiKey)
        .send({
          monthlyAllowance: 5,
          maxUnitsPerRequest: 2,
        });

      expect(restricted.status).toBe(200);

      const requestLimited = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 3,
        });

      expect(requestLimited.status).toBe(200);
      expect(requestLimited.body.status).toBe("rejected");
      expect(requestLimited.body.rejectionReason).toBe("user_request_limit");

      const monthlyLimited = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 1,
        });

      expect(monthlyLimited.status).toBe(200);
      expect(monthlyLimited.body.status).toBe("rejected");
      expect(monthlyLimited.body.rejectionReason).toBe("user_monthly_limit");

      const preservedUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(preservedUsage.status).toBe(200);
      expect(preservedUsage.body.usedUnits).toBe(10);

      const expanded = await request(app)
        .patch(`/api/plans/${created.body.id}`)
        .set("x-api-key", apiKey)
        .send({
          monthlyAllowance: 20,
          maxUnitsPerRequest: 10,
        });

      expect(expanded.status).toBe(200);

      const accepted = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 10,
        });

      expect(accepted.status).toBe(200);
      expect(accepted.body.status).toBe("accepted");

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(20);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(20);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
