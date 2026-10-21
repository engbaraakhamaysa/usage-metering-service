import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Change user plans and verify plan accessibility
///////////////////////////////////////////////////////
describe("PATCH /api/users/:id/plan", () => {
  it("changes the user's plan to Premium and saves it", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const premium = await getPublicPlan("Premium", "user");

      const response = await request(app)
        .patch(`/api/users/${user.id}/plan`)
        .set("x-api-key", apiKey)
        .send({ planId: premium.id });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
      expect(response.body.planId).toBe(premium.id);

      const fetched = await request(app)
        .get(`/api/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(fetched.status).toBe(200);
      expect(fetched.body.planId).toBe(premium.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("accepts a private user plan owned by the account", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const created = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Private User Plan",
          planType: "user",
          monthlyAllowance: 700,
          maxUnitsPerRequest: 50,
        });

      expect(created.status).toBe(201);

      const response = await request(app)
        .patch(`/api/users/${user.id}/plan`)
        .set("x-api-key", apiKey)
        .send({ planId: created.body.id });

      expect(response.status).toBe(200);
      expect(response.body.planId).toBe(created.body.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects a private user plan owned by another account", async () => {
    const owner = await createTestAccount();

    try {
      const other = await createTestAccount();

      try {
        const user = await createTestUser(other.account.id);

        const created = await request(app)
          .post("/api/plans")
          .set("x-api-key", owner.apiKey)
          .send({
            name: "Other Account User Plan",
            planType: "user",
            monthlyAllowance: 700,
            maxUnitsPerRequest: 50,
          });

        expect(created.status).toBe(201);

        const response = await request(app)
          .patch(`/api/users/${user.id}/plan`)
          .set("x-api-key", other.apiKey)
          .send({ planId: created.body.id });

        expect(response.status).toBe(400);

        const fetched = await request(app)
          .get(`/api/users/${user.id}`)
          .set("x-api-key", other.apiKey);

        expect(fetched.status).toBe(200);
        expect(fetched.body.planId).toBe(user.planId);
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });

  it("rejects an account plan without changing the user's plan", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const plan = await getPublicPlan("Pro", "account");

      const response = await request(app)
        .patch(`/api/users/${user.id}/plan`)
        .set("x-api-key", apiKey)
        .send({ planId: plan.id });

      expect(response.status).toBe(400);

      const fetched = await request(app)
        .get(`/api/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(fetched.status).toBe(200);
      expect(fetched.body.planId).toBe(user.planId);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
