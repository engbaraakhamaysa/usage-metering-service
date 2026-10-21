import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify concurrent users respect the shared allowance
///////////////////////////////////////////////////////
describe("Concurrent account allowance", () => {
  it("does not exceed the shared account allowance across concurrent users", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const firstUser = await createTestUser(account.id, "Premium");
      const secondUser = await createTestUser(account.id, "Premium");

      const submissions = Array.from({ length: 16 }, (_, index) => ({
        userId: index % 2 === 0 ? firstUser.id : secondUser.id,
        requestId: randomUUID(),
        requestedUnits: 100,
      }));

      const responses = await Promise.all(
        submissions.map((body) =>
          request(app)
            .post("/api/usage/consume")
            .set("x-api-key", apiKey)
            .send(body),
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
      expect(rejected.length).toBe(6);

      for (const response of rejected) {
        expect(response.body.rejectionReason).toBe("account_monthly_limit");
      }

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const firstUsage = await request(app)
        .get(`/api/usage/users/${firstUser.id}`)
        .set("x-api-key", apiKey);

      const secondUsage = await request(app)
        .get(`/api/usage/users/${secondUser.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(1_000);

      expect(firstUsage.status).toBe(200);
      expect(secondUsage.status).toBe(200);

      const firstAcceptedUnits =
        accepted.filter((response) => response.body.userId === firstUser.id)
          .length * 100;

      const secondAcceptedUnits =
        accepted.filter((response) => response.body.userId === secondUser.id)
          .length * 100;

      expect(firstUsage.body.usedUnits).toBe(firstAcceptedUnits);
      expect(secondUsage.body.usedUnits).toBe(secondAcceptedUnits);

      expect(firstUsage.body.usedUnits + secondUsage.body.usedUnits).toBe(
        1_000,
      );

      const records = await request(app)
        .get("/api/usage/records")
        .query({ limit: 100 })
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(16);
      expect(records.body.records.length).toBe(16);

      expect(records.body.records).toEqual(
        jasmine.arrayWithExactContents(
          responses.map((response) =>
            jasmine.objectContaining({
              id: response.body.id,
              requestId: response.body.requestId,
              userId: response.body.userId,
              status: response.body.status,
              requestedUnits: 100,
            }),
          ),
        ),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
