import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
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
// Verify monthly usage isolation and preservation
///////////////////////////////////////////////////////
describe("Monthly period isolation", () => {
  it("starts current usage independently and preserves previous usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const initial = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(initial.status).toBe(200);
      expect(initial.body.usedUnits).toBe(0);

      const currentPeriod: string = initial.body.periodStart;
      const previousDate = new Date(`${currentPeriod}T00:00:00Z`);

      previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);

      const previousPeriod = previousDate.toISOString().slice(0, 10);

      // Exhaust the previous month's account and user allowances.
      await db.insert(usage).values([
        {
          accountId: account.id,
          userId: null,
          periodStart: previousPeriod,
          usedUnits: 1_000,
        },
        {
          accountId: account.id,
          userId: user.id,
          periodStart: previousPeriod,
          usedUnits: 100,
        },
      ]);

      const before = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(before.status).toBe(200);
      expect(before.body.periodStart).toBe(currentPeriod);
      expect(before.body.usedUnits).toBe(0);

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

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.periodStart).toBe(currentPeriod);
      expect(accountUsage.body.usedUnits).toBe(10);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.periodStart).toBe(currentPeriod);
      expect(userUsage.body.usedUnits).toBe(10);

      const previousRows = await db
        .select()
        .from(usage)
        .where(
          and(
            eq(usage.accountId, account.id),
            eq(usage.periodStart, previousPeriod),
          ),
        );

      expect(previousRows).toEqual(
        jasmine.arrayWithExactContents([
          jasmine.objectContaining({
            userId: null,
            periodStart: previousPeriod,
            usedUnits: 1_000,
          }),
          jasmine.objectContaining({
            userId: user.id,
            periodStart: previousPeriod,
            usedUnits: 100,
          }),
        ]),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
