import request from "supertest";

import app from "../../src/app.js";

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
