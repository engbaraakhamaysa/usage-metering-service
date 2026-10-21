import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";
import { db } from "../../src/db/connection.js";
import { usage } from "../../src/db/schema/usage.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Read usage, remaining allowances, and current plans
///////////////////////////////////////////////////////
describe("Usage queries", () => {
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

  it("rejects invalid and future months", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const futureDate = new Date();

      futureDate.setUTCDate(1);
      futureDate.setUTCMonth(futureDate.getUTCMonth() + 1);

      const invalidMonths = [
        "2026-00",
        "2026-13",
        "2026-1",
        "2026-01-01",
        "0000-01",
        "invalid",
        "",
        futureDate.toISOString().slice(0, 7),
      ];

      const paths = ["/api/usage/account", `/api/usage/users/${user.id}`];

      for (const path of paths) {
        for (const month of invalidMonths) {
          const response = await request(app)
            .get(path)
            .query({ month })
            .set("x-api-key", apiKey);

          expect(response.status)
            .withContext(`${path}?month=${month}`)
            .toBe(400);
        }
      }
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("returns 404 for a user that does not exist", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get(`/api/usage/users/${randomUUID()}`)
        .set("x-api-key", apiKey);

      expect(response.status).toBe(404);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("does not expose another account's user usage", async () => {
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

        const forbidden = await request(app)
          .get(`/api/usage/users/${user.id}`)
          .set("x-api-key", other.apiKey);

        expect(forbidden.status).toBe(404);

        const previousDate = new Date();

        previousDate.setUTCDate(1);
        previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);

        const forbiddenHistory = await request(app)
          .get(`/api/usage/users/${user.id}`)
          .query({
            month: previousDate.toISOString().slice(0, 7),
          })
          .set("x-api-key", other.apiKey);

        expect(forbiddenHistory.status).toBe(404);

        const ownUsage = await request(app)
          .get(`/api/usage/users/${user.id}`)
          .set("x-api-key", owner.apiKey);

        expect(ownUsage.status).toBe(200);
        expect(ownUsage.body.usedUnits).toBe(5);

        const otherAccountUsage = await request(app)
          .get("/api/usage/account")
          .set("x-api-key", other.apiKey);

        expect(otherAccountUsage.status).toBe(200);
        expect(otherAccountUsage.body.usedUnits).toBe(0);
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });

  it("rejects usage queries without an API key", async () => {
    const paths = ["/api/usage/account", `/api/usage/users/${randomUUID()}`];

    for (const path of paths) {
      const response = await request(app).get(path);

      expect(response.status).withContext(path).toBe(401);
    }
  });

  it("rejects usage queries with an invalid API key", async () => {
    const paths = ["/api/usage/account", `/api/usage/users/${randomUUID()}`];

    const invalidApiKey = randomUUID();

    for (const path of paths) {
      const response = await request(app)
        .get(path)
        .set("x-api-key", invalidApiKey);

      expect(response.status).withContext(path).toBe(401);
    }
  });

  it("rejects an invalid user ID format", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get("/api/usage/users/not-a-uuid")
        .set("x-api-key", apiKey);

      expect(response.status).toBe(400);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
