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
// Verify user upgrades preserve usage and apply new limits
///////////////////////////////////////////////////////
describe("Usage after user plan changes", () => {
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
});
