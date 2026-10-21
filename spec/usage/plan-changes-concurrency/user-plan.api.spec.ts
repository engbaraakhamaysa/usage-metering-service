import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
  getPublicPlan,
} from "../../helpers/fixtures.js";

import { runWhileAccountLocked } from "../../helpers/account-lock.js";

///////////////////////////////////////////////////////
// Coordinate user plan changes with the account lock
///////////////////////////////////////////////////////
describe("Concurrent user plan changes", () => {
  it("waits before switching a user's plan and then applies the new limits", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const premium = await getPublicPlan("Premium", "user");

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

      const updated = await runWhileAccountLocked(account.id, () =>
        request(app)
          .patch(`/api/users/${user.id}/plan`)
          .set("x-api-key", apiKey)
          .send({ planId: premium.id })
          .then((response) => response),
      );

      expect(updated.status).toBe(200);
      expect(updated.body.planId).toBe(premium.id);

      const consumed = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 20,
        });

      expect(consumed.status).toBe(200);
      expect(consumed.body.status).toBe("accepted");

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(30);
      expect(userUsage.body.currentPlan.id).toBe(premium.id);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(30);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
