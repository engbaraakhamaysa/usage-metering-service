import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Update private plans and verify ownership protection
///////////////////////////////////////////////////////
describe("PATCH /api/plans/:id", () => {
  it("updates a private plan owned by the account", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const created = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Editable Plan",
          planType: "user",
          monthlyAllowance: 500,
          maxUnitsPerRequest: 20,
        });

      expect(created.status).toBe(201);

      const response = await request(app)
        .patch(`/api/plans/${created.body.id}`)
        .set("x-api-key", apiKey)
        .send({
          name: "Updated Plan",
          monthlyAllowance: 800,
          maxUnitsPerRequest: 30,
        });

      expect(response.status).toBe(200);

      expect(response.body).toEqual(
        jasmine.objectContaining({
          id: created.body.id,
          name: "Updated Plan",
          monthlyAllowance: 800,
          maxUnitsPerRequest: 30,
          planType: "user",
          ownerAccountId: account.id,
        }),
      );

      const fetched = await request(app)
        .get("/api/plans/me")
        .set("x-api-key", apiKey);

      expect(fetched.status).toBe(200);

      expect(fetched.body).toEqual(
        jasmine.arrayContaining([
          jasmine.objectContaining({
            id: created.body.id,
            name: "Updated Plan",
            monthlyAllowance: 800,
            maxUnitsPerRequest: 30,
          }),
        ]),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects renaming a plan to an existing name within the same account and type", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const first = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "First User Plan",
          planType: "user",
          monthlyAllowance: 100,
          maxUnitsPerRequest: 10,
        });

      const second = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Second User Plan",
          planType: "user",
          monthlyAllowance: 200,
          maxUnitsPerRequest: 20,
        });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);

      const response = await request(app)
        .patch(`/api/plans/${second.body.id}`)
        .set("x-api-key", apiKey)
        .send({
          name: "First User Plan",
          monthlyAllowance: 999,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(
        "Plan name already exists for this account and type",
      );

      const available = await request(app)
        .get("/api/plans/me")
        .set("x-api-key", apiKey);

      expect(available.status).toBe(200);

      expect(available.body).toEqual(
        jasmine.arrayContaining([
          jasmine.objectContaining({
            id: first.body.id,
            name: "First User Plan",
            monthlyAllowance: 100,
            maxUnitsPerRequest: 10,
          }),
          jasmine.objectContaining({
            id: second.body.id,
            name: "Second User Plan",
            monthlyAllowance: 200,
            maxUnitsPerRequest: 20,
          }),
        ]),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("does not modify another account's private plan", async () => {
    const owner = await createTestAccount();

    try {
      const other = await createTestAccount();

      try {
        const created = await request(app)
          .post("/api/plans")
          .set("x-api-key", owner.apiKey)
          .send({
            name: "Protected Plan",
            planType: "user",
            monthlyAllowance: 500,
            maxUnitsPerRequest: 20,
          });

        expect(created.status).toBe(201);

        const response = await request(app)
          .patch(`/api/plans/${created.body.id}`)
          .set("x-api-key", other.apiKey)
          .send({ monthlyAllowance: 999 });

        expect(response.status).toBe(404);

        const fetched = await request(app)
          .get("/api/plans/me")
          .set("x-api-key", owner.apiKey);

        expect(fetched.status).toBe(200);

        expect(fetched.body).toEqual(
          jasmine.arrayContaining([
            jasmine.objectContaining({
              id: created.body.id,
              monthlyAllowance: 500,
            }),
          ]),
        );
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });

  it("does not modify a public plan", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const plan = await getPublicPlan("Basic", "user");

      const response = await request(app)
        .patch(`/api/plans/${plan.id}`)
        .set("x-api-key", apiKey)
        .send({
          monthlyAllowance: plan.monthlyAllowance + 1,
        });

      expect(response.status).toBe(404);

      const unchangedPlan = await getPublicPlan("Basic", "user");

      expect(unchangedPlan.monthlyAllowance).toBe(plan.monthlyAllowance);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects an empty update body", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const created = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Empty Update Plan",
          planType: "user",
          monthlyAllowance: 500,
          maxUnitsPerRequest: 20,
        });

      expect(created.status).toBe(201);

      const response = await request(app)
        .patch(`/api/plans/${created.body.id}`)
        .set("x-api-key", apiKey)
        .send({});

      expect(response.status).toBe(400);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
