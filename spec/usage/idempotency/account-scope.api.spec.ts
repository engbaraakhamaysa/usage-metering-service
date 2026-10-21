import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify request IDs are scoped to individual accounts
///////////////////////////////////////////////////////
describe("Usage idempotency account scope", () => {
  it("allows the same request ID independently in different accounts", async () => {
    const first = await createTestAccount();

    try {
      const second = await createTestAccount();

      try {
        const firstUser = await createTestUser(first.account.id);
        const secondUser = await createTestUser(second.account.id);
        const requestId = randomUUID();

        const firstResponse = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", first.apiKey)
          .send({
            userId: firstUser.id,
            requestId,
            requestedUnits: 5,
          });

        const secondResponse = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", second.apiKey)
          .send({
            userId: secondUser.id,
            requestId,
            requestedUnits: 5,
          });

        expect(firstResponse.status).toBe(200);
        expect(firstResponse.body.status).toBe("accepted");
        expect(firstResponse.body.duplicate).toBeFalse();

        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body.status).toBe("accepted");
        expect(secondResponse.body.duplicate).toBeFalse();

        expect(firstResponse.body.id).not.toBe(secondResponse.body.id);

        const firstUsage = await request(app)
          .get("/api/usage/account")
          .set("x-api-key", first.apiKey);

        const secondUsage = await request(app)
          .get("/api/usage/account")
          .set("x-api-key", second.apiKey);

        expect(firstUsage.status).toBe(200);
        expect(firstUsage.body.usedUnits).toBe(5);

        expect(secondUsage.status).toBe(200);
        expect(secondUsage.body.usedUnits).toBe(5);

        const firstRecords = await request(app)
          .get("/api/usage/records")
          .set("x-api-key", first.apiKey);

        const secondRecords = await request(app)
          .get("/api/usage/records")
          .set("x-api-key", second.apiKey);

        expect(firstRecords.status).toBe(200);
        expect(firstRecords.body.pagination.total).toBe(1);
        expect(firstRecords.body.records[0].accountId).toBe(first.account.id);

        expect(secondRecords.status).toBe(200);
        expect(secondRecords.body.pagination.total).toBe(1);
        expect(secondRecords.body.records[0].accountId).toBe(second.account.id);
      } finally {
        await deleteTestAccount(second.account.id);
      }
    } finally {
      await deleteTestAccount(first.account.id);
    }
  });
});
