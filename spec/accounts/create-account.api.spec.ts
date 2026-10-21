import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import { deleteTestAccount, getPublicPlan } from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Create accounts using public account plans
///////////////////////////////////////////////////////
describe("POST /api/accounts", () => {
  it("creates an account and returns a usable API key", async () => {
    const plan = await getPublicPlan("Starter", "account");

    const response = await request(app).post("/api/accounts").send({
      name: "Test Application",
      planId: plan.id,
    });

    expect(response.status).toBe(201);

    // Stop if creation failed, since there is no account to clean up.
    if (response.status !== 201) {
      return;
    }

    try {
      expect(response.body).toEqual(
        jasmine.objectContaining({
          id: jasmine.any(String),
          name: "Test Application",
          planId: plan.id,
          apiKey: jasmine.any(String),
        }),
      );

      expect(response.body.apiKeyHash).toBeUndefined();

      const authenticatedResponse = await request(app)
        .get("/api/plans/me")
        .set("x-api-key", response.body.apiKey);

      expect(authenticatedResponse.status).toBe(200);
    } finally {
      await deleteTestAccount(response.body.id);
    }
  });

  it("rejects a user plan when creating an account", async () => {
    const plan = await getPublicPlan("Basic", "user");

    const response = await request(app).post("/api/accounts").send({
      name: "Invalid Plan Application",
      planId: plan.id,
    });

    expect(response.status).toBe(400);
  });

  it("rejects a plan that does not exist", async () => {
    const response = await request(app).post("/api/accounts").send({
      name: "Missing Plan Application",
      planId: randomUUID(),
    });

    expect(response.status).toBe(400);
  });

  it("rejects an empty account name", async () => {
    const plan = await getPublicPlan("Starter", "account");

    const response = await request(app).post("/api/accounts").send({
      name: "   ",
      planId: plan.id,
    });

    expect(response.status).toBe(400);
  });
});
