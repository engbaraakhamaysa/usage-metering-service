import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Read account and user usage
///////////////////////////////////////////////////////
describe("Usage queries", () => {
  it("returns zero usage for a new account and user", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);

      expect(accountUsage.body).toEqual(
        jasmine.objectContaining({
          accountId: account.id,
          usedUnits: 0,
          periodStart: jasmine.stringMatching(/^\d{4}-\d{2}-01$/),
        }),
      );

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);

      expect(userUsage.body).toEqual(
        jasmine.objectContaining({
          accountId: account.id,
          userId: user.id,
          usedUnits: 0,
          periodStart: accountUsage.body.periodStart,
        }),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("returns 404 for a user that does not exist", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get(`/api/usage/users/${randomUUID()}`)
        .set("x-api-key", apiKey);

      expect(response.status).toBe(404);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("does not expose another account's user usage", async () => {
    const owner = await createTestAccount();

    try {
      const other = await createTestAccount();

      try {
        const user = await createTestUser(owner.account.id);

        const consumed = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", owner.apiKey)
          .send({
            userId: user.id,
            requestId: randomUUID(),
            requestedUnits: 5,
          });

        expect(consumed.status).toBe(200);
        expect(consumed.body.status).toBe("accepted");

        const forbidden = await request(app)
          .get(`/api/usage/users/${user.id}`)
          .set("x-api-key", other.apiKey);

        expect(forbidden.status).toBe(404);

        const ownUsage = await request(app)
          .get(`/api/usage/users/${user.id}`)
          .set("x-api-key", owner.apiKey);

        expect(ownUsage.status).toBe(200);
        expect(ownUsage.body.usedUnits).toBe(5);

        const otherAccountUsage = await request(app)
          .get("/api/usage/account")
          .set("x-api-key", other.apiKey);

        expect(otherAccountUsage.status).toBe(200);
        expect(otherAccountUsage.body.usedUnits).toBe(0);
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });

  it("rejects usage queries without an API key", async () => {
    const paths = ["/api/usage/account", `/api/usage/users/${randomUUID()}`];

    for (const path of paths) {
      const response = await request(app).get(path);

      expect(response.status).withContext(path).toBe(401);
    }
  });

  it("rejects usage queries with an invalid API key", async () => {
    const paths = ["/api/usage/account", `/api/usage/users/${randomUUID()}`];

    const invalidApiKey = randomUUID();

    for (const path of paths) {
      const response = await request(app)
        .get(path)
        .set("x-api-key", invalidApiKey);

      expect(response.status).withContext(path).toBe(401);
    }
  });

  it("rejects an invalid user ID format", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get("/api/usage/users/not-a-uuid")
        .set("x-api-key", apiKey);

      expect(response.status).toBe(400);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
