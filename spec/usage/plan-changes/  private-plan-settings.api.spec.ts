import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify private plan setting changes preserve usage
///////////////////////////////////////////////////////
describe("Usage after private plan setting changes", () => {
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
