import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

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
