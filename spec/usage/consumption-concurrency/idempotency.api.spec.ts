import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify simultaneous duplicate requests are counted once
///////////////////////////////////////////////////////
describe("Concurrent consumption idempotency", () => {
  it("counts simultaneous copies of the same request only once", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const body = {
        userId: user.id,
        requestId: randomUUID(),
        requestedUnits: 10,
      };

      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(app)
            .post("/api/usage/consume")
            .set("x-api-key", apiKey)
            .send(body),
        ),
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("accepted");
        expect(response.body.requestId).toBe(body.requestId);
      }

      const originals = responses.filter(
        (response) => response.body.duplicate === false,
      );

      const duplicates = responses.filter(
        (response) => response.body.duplicate === true,
      );

      expect(originals.length).toBe(1);
      expect(duplicates.length).toBe(9);

      const recordIds = new Set(responses.map((response) => response.body.id));

      expect(recordIds.size).toBe(1);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(10);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(10);

      const records = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(records.status).toBe(200);
      expect(records.body.pagination.total).toBe(1);
      expect(records.body.records.length).toBe(1);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
