import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify concurrent requests respect the user allowance
///////////////////////////////////////////////////////
describe("Concurrent user allowance", () => {
  it("does not exceed the user monthly allowance under concurrent requests", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const responses = await Promise.all(
        Array.from({ length: 15 }, () =>
          request(app)
            .post("/api/usage/consume")
            .set("x-api-key", apiKey)
            .send({
              userId: user.id,
              requestId: randomUUID(),
              requestedUnits: 10,
            }),
        ),
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body.duplicate).toBeFalse();
      }

      const accepted = responses.filter(
        (response) => response.body.status === "accepted",
      );

      const rejected = responses.filter(
        (response) => response.body.status === "rejected",
      );

      expect(accepted.length).toBe(10);
      expect(rejected.length).toBe(5);

      for (const response of rejected) {
        expect(response.body.rejectionReason).toBe("user_monthly_limit");
      }

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(100);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(100);

      const records = await request(app)
        .get("/api/usage/records")
        .query({ limit: 100 })
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(15);
      expect(records.body.records.length).toBe(15);

      expect(records.body.records).toEqual(
        jasmine.arrayWithExactContents(
          responses.map((response) =>
            jasmine.objectContaining({
              id: response.body.id,
              requestId: response.body.requestId,
              status: response.body.status,
              requestedUnits: 10,
            }),
          ),
        ),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
