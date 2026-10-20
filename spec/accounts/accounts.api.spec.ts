import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

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

///////////////////////////////////////////////////////
// Change the authenticated account plan
///////////////////////////////////////////////////////
describe("PATCH /api/accounts/me/plan", () => {
  it("changes the account plan to Pro", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const plan = await getPublicPlan("Pro", "account");

      const response = await request(app)
        .patch("/api/accounts/me/plan")
        .set("x-api-key", apiKey)
        .send({ planId: plan.id });

      expect(response.status).toBe(200);

      expect(response.body).toEqual(
        jasmine.objectContaining({
          id: account.id,
          planId: plan.id,
        }),
      );

      expect(response.body.apiKeyHash).toBeUndefined();
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("accepts a private account plan owned by the account", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const created = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Private Account Plan",
          planType: "account",
          monthlyAllowance: 5_000,
          maxUnitsPerRequest: 500,
        });

      expect(created.status).toBe(201);

      const response = await request(app)
        .patch("/api/accounts/me/plan")
        .set("x-api-key", apiKey)
        .send({ planId: created.body.id });

      expect(response.status).toBe(200);
      expect(response.body.planId).toBe(created.body.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects a private plan owned by another account", async () => {
    const owner = await createTestAccount();

    try {
      const other = await createTestAccount();

      try {
        const created = await request(app)
          .post("/api/plans")
          .set("x-api-key", owner.apiKey)
          .send({
            name: "Owner Account Plan",
            planType: "account",
            monthlyAllowance: 5_000,
            maxUnitsPerRequest: 500,
          });

        expect(created.status).toBe(201);

        const response = await request(app)
          .patch("/api/accounts/me/plan")
          .set("x-api-key", other.apiKey)
          .send({ planId: created.body.id });

        expect(response.status).toBe(400);
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });

  it("rejects a user plan", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const plan = await getPublicPlan("Basic", "user");

      const response = await request(app)
        .patch("/api/accounts/me/plan")
        .set("x-api-key", apiKey)
        .send({ planId: plan.id });

      expect(response.status).toBe(400);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects requests without an API key", async () => {
    const plan = await getPublicPlan("Pro", "account");

    const response = await request(app)
      .patch("/api/accounts/me/plan")
      .send({ planId: plan.id });

    expect(response.status).toBe(401);
  });
});
