import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Validate usage queries and verify account isolation
///////////////////////////////////////////////////////
describe("Usage query validation and access", () => {
  it("rejects invalid and future months", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const futureDate = new Date();

      futureDate.setUTCDate(1);
      futureDate.setUTCMonth(futureDate.getUTCMonth() + 1);

      const invalidMonths = [
        "2026-00",
        "2026-13",
        "2026-1",
        "2026-01-01",
        "0000-01",
        "invalid",
        "",
        futureDate.toISOString().slice(0, 7),
      ];

      const paths = ["/api/usage/account", `/api/usage/users/${user.id}`];

      for (const path of paths) {
        for (const month of invalidMonths) {
          const response = await request(app)
            .get(path)
            .query({ month })
            .set("x-api-key", apiKey);

          expect(response.status)
            .withContext(`${path}?month=${month}`)
            .toBe(400);
        }
      }
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

        const previousDate = new Date();

        previousDate.setUTCDate(1);
        previousDate.setUTCMonth(previousDate.getUTCMonth() - 1);

        const forbiddenHistory = await request(app)
          .get(`/api/usage/users/${user.id}`)
          .query({
            month: previousDate.toISOString().slice(0, 7),
          })
          .set("x-api-key", other.apiKey);

        expect(forbiddenHistory.status).toBe(404);

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
