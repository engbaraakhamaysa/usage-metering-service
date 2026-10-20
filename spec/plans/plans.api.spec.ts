import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Get public plans
///////////////////////////////////////////////////////
describe("GET /api/plans", () => {
  it("returns public plans without authentication", async () => {
    const response = await request(app).get("/api/plans");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTrue();
  });

  it("returns only account plans when filtered", async () => {
    const response = await request(app)
      .get("/api/plans")
      .query({ planType: "account" });

    expect(response.status).toBe(200);

    expect(response.body).toEqual(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          name: "Starter",
          planType: "account",
          ownerAccountId: null,
        }),
        jasmine.objectContaining({
          name: "Pro",
          planType: "account",
          ownerAccountId: null,
        }),
      ]),
    );

    for (const plan of response.body) {
      expect(plan.planType).toBe("account");
      expect(plan.ownerAccountId).toBeNull();
    }
  });

  it("rejects an invalid plan type", async () => {
    const response = await request(app)
      .get("/api/plans")
      .query({ planType: "invalid" });

    expect(response.status).toBe(400);
  });
});

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

///////////////////////////////////////////////////////
// Verify private plan visibility and account isolation
///////////////////////////////////////////////////////
describe("GET /api/plans/me", () => {
  it("returns public and owned plans without exposing another account's plans", async () => {
    const first = await createTestAccount();

    try {
      const second = await createTestAccount();

      try {
        const ownedPlanResponse = await request(app)
          .post("/api/plans")
          .set("x-api-key", first.apiKey)
          .send({
            name: "First Account Plan",
            planType: "user",
            monthlyAllowance: 500,
            maxUnitsPerRequest: 20,
          });

        const otherPlanResponse = await request(app)
          .post("/api/plans")
          .set("x-api-key", second.apiKey)
          .send({
            name: "Second Account Plan",
            planType: "user",
            monthlyAllowance: 500,
            maxUnitsPerRequest: 20,
          });

        expect(ownedPlanResponse.status).toBe(201);
        expect(otherPlanResponse.status).toBe(201);

        const response = await request(app)
          .get("/api/plans/me")
          .set("x-api-key", first.apiKey)
          .query({ planType: "user" });

        expect(response.status).toBe(200);

        expect(response.body).toEqual(
          jasmine.arrayContaining([
            jasmine.objectContaining({
              name: "Basic",
              ownerAccountId: null,
            }),
            jasmine.objectContaining({
              id: ownedPlanResponse.body.id,
              ownerAccountId: first.account.id,
            }),
          ]),
        );

        expect(response.body).not.toEqual(
          jasmine.arrayContaining([
            jasmine.objectContaining({
              id: otherPlanResponse.body.id,
            }),
          ]),
        );

        for (const plan of response.body) {
          expect(plan.planType).toBe("user");

          expect(
            plan.ownerAccountId === null ||
              plan.ownerAccountId === first.account.id,
          ).toBeTrue();
        }

        const publicResponse = await request(app)
          .get("/api/plans")
          .query({ planType: "user" });

        expect(publicResponse.status).toBe(200);

        expect(publicResponse.body).not.toEqual(
          jasmine.arrayContaining([
            jasmine.objectContaining({
              id: ownedPlanResponse.body.id,
            }),
          ]),
        );

        for (const plan of publicResponse.body) {
          expect(plan.ownerAccountId).toBeNull();
        }
      } finally {
        await deleteTestAccount(second.account.id);
      }
    } finally {
      await deleteTestAccount(first.account.id);
    }
  });

  it("rejects requests without an API key", async () => {
    const response = await request(app).get("/api/plans/me");

    expect(response.status).toBe(401);
  });
});

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
