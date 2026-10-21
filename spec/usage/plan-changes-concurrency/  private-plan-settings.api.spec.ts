import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

import { runWhileAccountLocked } from "../../helpers/account-lock.js";

///////////////////////////////////////////////////////
// Coordinate private plan settings with the account lock
///////////////////////////////////////////////////////
describe("Concurrent private plan setting changes", () => {
  it("waits before editing private plan limits and then applies the new limits", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const created = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Locked User Plan",
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

      const updated = await runWhileAccountLocked(account.id, () =>
        request(app)
          .patch(`/api/plans/${created.body.id}`)
          .set("x-api-key", apiKey)
          .send({ maxUnitsPerRequest: 2 })
          .then((response) => response),
      );

      expect(updated.status).toBe(200);
      expect(updated.body.maxUnitsPerRequest).toBe(2);

      const rejected = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 3,
        });

      expect(rejected.status).toBe(200);
      expect(rejected.body.status).toBe("rejected");
      expect(rejected.body.rejectionReason).toBe("user_request_limit");

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(10);
      expect(userUsage.body.currentPlan.maxUnitsPerRequest).toBe(2);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(10);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
