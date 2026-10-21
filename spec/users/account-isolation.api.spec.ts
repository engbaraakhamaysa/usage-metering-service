import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify user isolation between accounts
///////////////////////////////////////////////////////
describe("User account isolation", () => {
  it("lists only users belonging to the authenticated account", async () => {
    const first = await createTestAccount();

    try {
      const second = await createTestAccount();

      try {
        const ownedUser = await createTestUser(first.account.id);
        await createTestUser(second.account.id);

        const response = await request(app)
          .get("/api/users")
          .set("x-api-key", first.apiKey);

        expect(response.status).toBe(200);

        expect(response.body).toEqual([
          jasmine.objectContaining({
            id: ownedUser.id,
            accountId: first.account.id,
          }),
        ]);
      } finally {
        await deleteTestAccount(second.account.id);
      }
    } finally {
      await deleteTestAccount(first.account.id);
    }
  });

  it("returns 404 when fetching another account's user", async () => {
    const owner = await createTestAccount();

    try {
      const other = await createTestAccount();

      try {
        const user = await createTestUser(owner.account.id);

        const response = await request(app)
          .get(`/api/users/${user.id}`)
          .set("x-api-key", other.apiKey);

        expect(response.status).toBe(404);
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });

  it("does not change another account's user plan", async () => {
    const owner = await createTestAccount();

    try {
      const other = await createTestAccount();

      try {
        const user = await createTestUser(owner.account.id);
        const premium = await getPublicPlan("Premium", "user");

        const response = await request(app)
          .patch(`/api/users/${user.id}/plan`)
          .set("x-api-key", other.apiKey)
          .send({ planId: premium.id });

        expect(response.status).toBe(404);

        const fetched = await request(app)
          .get(`/api/users/${user.id}`)
          .set("x-api-key", owner.apiKey);

        expect(fetched.status).toBe(200);
        expect(fetched.body.planId).toBe(user.planId);
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });
});
