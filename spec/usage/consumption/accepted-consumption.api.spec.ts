import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify accepted consumption updates counters and history
///////////////////////////////////////////////////////
describe("Accepted consumption", () => {
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
});
