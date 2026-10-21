import request from "supertest";

import app from "../../../src/app.js";
import { db } from "../../../src/db/connection.js";
import { usage } from "../../../src/db/schema/usage.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Read usage for previous months
///////////////////////////////////////////////////////
describe("Historical usage queries", () => {
  it("returns previous usage with null historical remaining allowance", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const initial = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(initial.status).toBe(200);

      const currentPeriod: string = initial.body.periodStart;
      const previousDate = new Date(`${currentPeriod}T00:00:00Z`);

      previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);

      const previousPeriod = previousDate.toISOString().slice(0, 10);
      const month = previousPeriod.slice(0, 7);

      await db.insert(usage).values([
        {
          accountId: account.id,
          userId: null,
          periodStart: previousPeriod,
          usedUnits: 80,
        },
        {
          accountId: account.id,
          userId: user.id,
          periodStart: previousPeriod,
          usedUnits: 80,
        },
      ]);

      const accountHistory = await request(app)
        .get("/api/usage/account")
        .query({ month })
        .set("x-api-key", apiKey);

      const userHistory = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .query({ month })
        .set("x-api-key", apiKey);

      expect(accountHistory.status).toBe(200);
      expect(accountHistory.body.periodStart).toBe(previousPeriod);
      expect(accountHistory.body.usedUnits).toBe(80);
      expect(accountHistory.body.remainingUnits).toBeNull();
      expect(accountHistory.body.currentPlan.id).toBe(account.planId);

      expect(userHistory.status).toBe(200);
      expect(userHistory.body.periodStart).toBe(previousPeriod);
      expect(userHistory.body.usedUnits).toBe(80);
      expect(userHistory.body.remainingUnits).toBeNull();
      expect(userHistory.body.currentPlan.id).toBe(user.planId);

      const currentUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(currentUsage.status).toBe(200);
      expect(currentUsage.body.periodStart).toBe(currentPeriod);
      expect(currentUsage.body.usedUnits).toBe(0);
      expect(currentUsage.body.remainingUnits).toBe(
        currentUsage.body.currentPlan.monthlyAllowance,
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("returns zero for a previous month without usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const previousDate = new Date();

      previousDate.setUTCDate(1);
      previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);

      const month = previousDate.toISOString().slice(0, 7);

      const paths = ["/api/usage/account", `/api/usage/users/${user.id}`];

      for (const path of paths) {
        const response = await request(app)
          .get(path)
          .query({ month })
          .set("x-api-key", apiKey);

        expect(response.status).withContext(path).toBe(200);
        expect(response.body.periodStart).toBe(`${month}-01`);
        expect(response.body.usedUnits).toBe(0);
        expect(response.body.remainingUnits).toBeNull();
      }
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
