import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Reject request ID reuse with different consumption data
///////////////////////////////////////////////////////
describe("Usage idempotency conflicts", () => {
  it("rejects the same request ID with different units without changing usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const requestId = randomUUID();

      const first = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 5,
        });

      expect(first.status).toBe(200);
      expect(first.body.status).toBe("accepted");

      const conflict = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 6,
        });

      expect(conflict.status).toBe(409);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(5);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(5);

      const records = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(1);

      const original = await request(app)
        .get(`/api/usage/records/${first.body.id}`)
        .set("x-api-key", apiKey);

      expect(original.status).toBe(200);
      expect(original.body.requestedUnits).toBe(5);
      expect(original.body.status).toBe("accepted");
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects the same request ID for a different user without consuming again", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const firstUser = await createTestUser(account.id);
      const secondUser = await createTestUser(account.id);
      const requestId = randomUUID();

      const first = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: firstUser.id,
          requestId,
          requestedUnits: 5,
        });

      expect(first.status).toBe(200);
      expect(first.body.status).toBe("accepted");

      const conflict = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: secondUser.id,
          requestId,
          requestedUnits: 5,
        });

      expect(conflict.status).toBe(409);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const firstUserUsage = await request(app)
        .get(`/api/usage/users/${firstUser.id}`)
        .set("x-api-key", apiKey);

      const secondUserUsage = await request(app)
        .get(`/api/usage/users/${secondUser.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(5);

      expect(firstUserUsage.status).toBe(200);
      expect(firstUserUsage.body.usedUnits).toBe(5);

      expect(secondUserUsage.status).toBe(200);
      expect(secondUserUsage.body.usedUnits).toBe(0);

      const records = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(1);
      expect(records.body.records[0].userId).toBe(firstUser.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
