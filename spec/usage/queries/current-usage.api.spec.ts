import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
  getPublicPlan,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Read current usage, remaining allowances, and plans
///////////////////////////////////////////////////////
describe("Current usage queries", () => {
  it("returns zero usage, full allowances, and current plans", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const accountPlan = await getPublicPlan("Starter", "account");
      const userPlan = await getPublicPlan("Basic", "user");

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);

      expect(accountUsage.body).toEqual(
        jasmine.objectContaining({
          accountId: account.id,
          usedUnits: 0,
          remainingUnits: accountPlan.monthlyAllowance,
          periodStart: jasmine.stringMatching(/^\d{4}-\d{2}-01$/),
          currentPlan: {
            id: accountPlan.id,
            name: accountPlan.name,
            monthlyAllowance: accountPlan.monthlyAllowance,
            maxUnitsPerRequest: accountPlan.maxUnitsPerRequest,
          },
        }),
      );

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);

      expect(userUsage.body).toEqual(
        jasmine.objectContaining({
          accountId: account.id,
          userId: user.id,
          usedUnits: 0,
          remainingUnits: userPlan.monthlyAllowance,
          periodStart: accountUsage.body.periodStart,
          currentPlan: {
            id: userPlan.id,
            name: userPlan.name,
            monthlyAllowance: userPlan.monthlyAllowance,
            maxUnitsPerRequest: userPlan.maxUnitsPerRequest,
          },
        }),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("subtracts accepted consumption from both remaining allowances", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const consumed = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 5,
        });

      expect(consumed.status).toBe(200);
      expect(consumed.body.status).toBe("accepted");

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(5);
      expect(accountUsage.body.remainingUnits).toBe(
        accountUsage.body.currentPlan.monthlyAllowance - 5,
      );

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(5);
      expect(userUsage.body.remainingUnits).toBe(
        userUsage.body.currentPlan.monthlyAllowance - 5,
      );

      const explicitMonth = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .query({
          month: userUsage.body.periodStart.slice(0, 7),
        })
        .set("x-api-key", apiKey);

      expect(explicitMonth.status).toBe(200);
      expect(explicitMonth.body).toEqual(userUsage.body);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("shows zero remaining when current allowances fall below usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const accountPlan = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Remaining Account Plan",
          planType: "account",
          monthlyAllowance: 100,
          maxUnitsPerRequest: 10,
        });

      const userPlan = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Remaining User Plan",
          planType: "user",
          monthlyAllowance: 100,
          maxUnitsPerRequest: 10,
        });

      expect(accountPlan.status).toBe(201);
      expect(userPlan.status).toBe(201);

      const accountAssignment = await request(app)
        .patch("/api/accounts/me/plan")
        .set("x-api-key", apiKey)
        .send({ planId: accountPlan.body.id });

      const userAssignment = await request(app)
        .patch(`/api/users/${user.id}/plan`)
        .set("x-api-key", apiKey)
        .send({ planId: userPlan.body.id });

      expect(accountAssignment.status).toBe(200);
      expect(userAssignment.status).toBe(200);

      const consumed = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 10,
        });

      expect(consumed.status).toBe(200);
      expect(consumed.body.status).toBe("accepted");

      for (const planId of [accountPlan.body.id, userPlan.body.id]) {
        const updated = await request(app)
          .patch(`/api/plans/${planId}`)
          .set("x-api-key", apiKey)
          .send({ monthlyAllowance: 5 });

        expect(updated.status).toBe(200);
      }

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(10);
      expect(accountUsage.body.remainingUnits).toBe(0);
      expect(accountUsage.body.currentPlan.id).toBe(accountPlan.body.id);
      expect(accountUsage.body.currentPlan.monthlyAllowance).toBe(5);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(10);
      expect(userUsage.body.remainingUnits).toBe(0);
      expect(userUsage.body.currentPlan.id).toBe(userPlan.body.id);
      expect(userUsage.body.currentPlan.monthlyAllowance).toBe(5);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
