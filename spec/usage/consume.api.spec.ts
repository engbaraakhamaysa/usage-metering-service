import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Consume usage and verify counters and history
///////////////////////////////////////////////////////
describe("POST /api/usage/consume", () => {
  it("accepts a request and updates both counters and its record", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const requestId = randomUUID();

      const response = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 10,
        });

      expect(response.status).toBe(200);

      expect(response.body).toEqual(
        jasmine.objectContaining({
          id: jasmine.any(String),
          accountId: account.id,
          userId: user.id,
          requestId,
          requestedUnits: 10,
          status: "accepted",
          rejectionReason: null,
          duplicate: false,
        }),
      );

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(10);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(10);

      const record = await request(app)
        .get(`/api/usage/records/${response.body.id}`)
        .set("x-api-key", apiKey);

      expect(record.status).toBe(200);

      expect(record.body).toEqual(
        jasmine.objectContaining({
          id: response.body.id,
          accountId: account.id,
          userId: user.id,
          requestId,
          requestedUnits: 10,
          status: "accepted",
          rejectionReason: null,
        }),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects requests above the user request limit without increasing usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const requestId = randomUUID();

      const response = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 11,
        });

      expect(response.status).toBe(200);

      expect(response.body).toEqual(
        jasmine.objectContaining({
          id: jasmine.any(String),
          accountId: account.id,
          userId: user.id,
          requestId,
          requestedUnits: 11,
          status: "rejected",
          rejectionReason: "user_request_limit",
          duplicate: false,
        }),
      );

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(0);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(0);

      const record = await request(app)
        .get(`/api/usage/records/${response.body.id}`)
        .set("x-api-key", apiKey);

      expect(record.status).toBe(200);

      expect(record.body).toEqual(
        jasmine.objectContaining({
          id: response.body.id,
          requestId,
          requestedUnits: 11,
          status: "rejected",
          rejectionReason: "user_request_limit",
        }),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("prioritizes the account request limit without increasing usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id, "Premium");
      const requestId = randomUUID();

      const response = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 101,
        });

      expect(response.status).toBe(200);

      expect(response.body).toEqual(
        jasmine.objectContaining({
          requestId,
          requestedUnits: 101,
          status: "rejected",
          rejectionReason: "account_request_limit",
          duplicate: false,
        }),
      );

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(0);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(0);

      const record = await request(app)
        .get(`/api/usage/records/${response.body.id}`)
        .set("x-api-key", apiKey);

      expect(record.status).toBe(200);
      expect(record.body.status).toBe("rejected");
      expect(record.body.rejectionReason).toBe("account_request_limit");
    } finally {
      await deleteTestAccount(account.id);
    }
  });
  it("accepts the exact user monthly allowance and rejects additional usage", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      for (let index = 0; index < 10; index++) {
        const accepted = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", apiKey)
          .send({
            userId: user.id,
            requestId: randomUUID(),
            requestedUnits: 10,
          });

        expect(accepted.status).toBe(200);
        expect(accepted.body.status).toBe("accepted");
      }

      const accountBefore = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userBefore = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountBefore.status).toBe(200);
      expect(accountBefore.body.usedUnits).toBe(100);

      expect(userBefore.status).toBe(200);
      expect(userBefore.body.usedUnits).toBe(100);

      const requestId = randomUUID();

      const rejected = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 1,
        });

      expect(rejected.status).toBe(200);

      expect(rejected.body).toEqual(
        jasmine.objectContaining({
          requestId,
          requestedUnits: 1,
          status: "rejected",
          rejectionReason: "user_monthly_limit",
          duplicate: false,
        }),
      );

      const accountAfter = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userAfter = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountAfter.status).toBe(200);
      expect(accountAfter.body.usedUnits).toBe(100);

      expect(userAfter.status).toBe(200);
      expect(userAfter.body.usedUnits).toBe(100);

      const record = await request(app)
        .get(`/api/usage/records/${rejected.body.id}`)
        .set("x-api-key", apiKey);

      expect(record.status).toBe(200);

      expect(record.body).toEqual(
        jasmine.objectContaining({
          requestId,
          status: "rejected",
          rejectionReason: "user_monthly_limit",
        }),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects usage when the shared account monthly allowance is exhausted", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const firstUser = await createTestUser(account.id, "Premium");
      const secondUser = await createTestUser(account.id, "Premium");

      for (let index = 0; index < 10; index++) {
        const accepted = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", apiKey)
          .send({
            userId: firstUser.id,
            requestId: randomUUID(),
            requestedUnits: 100,
          });

        expect(accepted.status).toBe(200);
        expect(accepted.body.status).toBe("accepted");
      }

      const accountBefore = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(accountBefore.status).toBe(200);
      expect(accountBefore.body.usedUnits).toBe(1_000);

      const requestId = randomUUID();

      const rejected = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: secondUser.id,
          requestId,
          requestedUnits: 1,
        });

      expect(rejected.status).toBe(200);

      expect(rejected.body).toEqual(
        jasmine.objectContaining({
          userId: secondUser.id,
          requestId,
          requestedUnits: 1,
          status: "rejected",
          rejectionReason: "account_monthly_limit",
          duplicate: false,
        }),
      );

      const accountAfter = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(accountAfter.status).toBe(200);
      expect(accountAfter.body.usedUnits).toBe(1_000);

      const firstUserUsage = await request(app)
        .get(`/api/usage/users/${firstUser.id}`)
        .set("x-api-key", apiKey);

      expect(firstUserUsage.status).toBe(200);
      expect(firstUserUsage.body.usedUnits).toBe(1_000);

      const secondUserUsage = await request(app)
        .get(`/api/usage/users/${secondUser.id}`)
        .set("x-api-key", apiKey);

      expect(secondUserUsage.status).toBe(200);
      expect(secondUserUsage.body.usedUnits).toBe(0);

      const record = await request(app)
        .get(`/api/usage/records/${rejected.body.id}`)
        .set("x-api-key", apiKey);

      expect(record.status).toBe(200);

      expect(record.body).toEqual(
        jasmine.objectContaining({
          requestId,
          userId: secondUser.id,
          status: "rejected",
          rejectionReason: "account_monthly_limit",
        }),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
