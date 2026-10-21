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
