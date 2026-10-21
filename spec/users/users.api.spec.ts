import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Create users under the authenticated account
///////////////////////////////////////////////////////
describe("POST /api/users", () => {
  it("creates a user belonging to the authenticated account", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const plan = await getPublicPlan("Basic", "user");

      const response = await request(app)
        .post("/api/users")
        .set("x-api-key", apiKey)
        .send({
          name: "Test User",
          planId: plan.id,
        });

      expect(response.status).toBe(201);

      expect(response.body).toEqual(
        jasmine.objectContaining({
          id: jasmine.any(String),
          name: "Test User",
          accountId: account.id,
          planId: plan.id,
        }),
      );

      const fetched = await request(app)
        .get(`/api/users/${response.body.id}`)
        .set("x-api-key", apiKey);

      expect(fetched.status).toBe(200);

      expect(fetched.body).toEqual(
        jasmine.objectContaining({
          id: response.body.id,
          name: "Test User",
          accountId: account.id,
          planId: plan.id,
        }),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects an account plan when creating a user", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const plan = await getPublicPlan("Starter", "account");

      const response = await request(app)
        .post("/api/users")
        .set("x-api-key", apiKey)
        .send({
          name: "Invalid Plan User",
          planId: plan.id,
        });

      expect(response.status).toBe(400);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects requests without an API key", async () => {
    const plan = await getPublicPlan("Basic", "user");

    const response = await request(app).post("/api/users").send({
      name: "Unauthorized User",
      planId: plan.id,
    });

    expect(response.status).toBe(401);
  });

  it("rejects a duplicate name within the account without creating another user", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const plan = await getPublicPlan("Basic", "user");
      const body = {
        name: "Duplicate User",
        planId: plan.id,
      };

      const created = await request(app)
        .post("/api/users")
        .set("x-api-key", apiKey)
        .send(body);

      expect(created.status).toBe(201);

      const duplicate = await request(app)
        .post("/api/users")
        .set("x-api-key", apiKey)
        .send(body);

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.message).toBe(
        "User name already exists in this account",
      );

      const listed = await request(app)
        .get("/api/users")
        .set("x-api-key", apiKey);

      expect(listed.status).toBe(200);
      expect(listed.body).toEqual([
        jasmine.objectContaining({
          id: created.body.id,
          name: body.name,
          accountId: account.id,
          planId: plan.id,
        }),
      ]);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("allows the same user name in different accounts", async () => {
    const first = await createTestAccount();

    try {
      const second = await createTestAccount();

      try {
        const plan = await getPublicPlan("Basic", "user");
        const body = {
          name: "Shared User Name",
          planId: plan.id,
        };

        const firstCreated = await request(app)
          .post("/api/users")
          .set("x-api-key", first.apiKey)
          .send(body);

        const secondCreated = await request(app)
          .post("/api/users")
          .set("x-api-key", second.apiKey)
          .send(body);

        expect(firstCreated.status).toBe(201);
        expect(secondCreated.status).toBe(201);

        expect(firstCreated.body.name).toBe(body.name);
        expect(secondCreated.body.name).toBe(body.name);

        expect(firstCreated.body.accountId).toBe(first.account.id);
        expect(secondCreated.body.accountId).toBe(second.account.id);
        expect(firstCreated.body.id).not.toBe(secondCreated.body.id);
      } finally {
        await deleteTestAccount(second.account.id);
      }
    } finally {
      await deleteTestAccount(first.account.id);
    }
  });
});

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
