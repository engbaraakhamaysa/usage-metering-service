import request from "supertest";

import app from "../../src/app.js";

import { createTestAccount, deleteTestAccount } from "../helpers/fixtures.js";

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
