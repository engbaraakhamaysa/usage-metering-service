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
// Verify account upgrades preserve shared usage
///////////////////////////////////////////////////////
describe("Usage after account plan changes", () => {
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
});
