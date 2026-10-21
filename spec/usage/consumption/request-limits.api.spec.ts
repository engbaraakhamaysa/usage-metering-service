import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify per-request limits and rejection recording
///////////////////////////////////////////////////////
describe("Consumption request limits", () => {
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
});
