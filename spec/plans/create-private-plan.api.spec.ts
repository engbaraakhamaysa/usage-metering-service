import request from "supertest";

import app from "../../src/app.js";

import { createTestAccount, deleteTestAccount } from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Create private plans
///////////////////////////////////////////////////////
describe("POST /api/plans", () => {
  it("creates a private plan owned by the authenticated account", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Custom User Plan",
          planType: "user",
          monthlyAllowance: 500,
          maxUnitsPerRequest: 20,
        });

      expect(response.status).toBe(201);

      expect(response.body).toEqual(
        jasmine.objectContaining({
          name: "Custom User Plan",
          planType: "user",
          monthlyAllowance: 500,
          maxUnitsPerRequest: 20,
          ownerAccountId: account.id,
        }),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects a duplicate plan name within the same account and type", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const body = {
        name: "Duplicate Plan",
        planType: "user",
        monthlyAllowance: 100,
        maxUnitsPerRequest: 10,
      };

      const created = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send(body);

      expect(created.status).toBe(201);

      const duplicate = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send(body);

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error).toBe(
        "Plan name already exists for this account and type",
      );

      const available = await request(app)
        .get("/api/plans/me")
        .set("x-api-key", apiKey);

      expect(available.status).toBe(200);

      const matchingPlans = available.body.filter(
        (plan: { name: string; planType: string }) =>
          plan.name === body.name && plan.planType === body.planType,
      );

      expect(matchingPlans.length).toBe(1);
      expect(matchingPlans[0].id).toBe(created.body.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects requests without an API key", async () => {
    const response = await request(app).post("/api/plans").send({
      name: "Unauthorized Plan",
      planType: "user",
      monthlyAllowance: 500,
      maxUnitsPerRequest: 20,
    });

    expect(response.status).toBe(401);
  });
});
