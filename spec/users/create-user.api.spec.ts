import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
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
      expect(duplicate.body.error).toBe(
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
