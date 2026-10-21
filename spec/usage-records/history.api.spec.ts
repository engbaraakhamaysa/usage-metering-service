import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Read usage history for the authenticated account
///////////////////////////////////////////////////////
describe("Usage history", () => {
  it("returns an empty history for a new account", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        records: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("includes accepted and rejected requests in history", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const accepted = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 5,
        });

      const rejected = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 11,
        });

      expect(accepted.status).toBe(200);
      expect(accepted.body.status).toBe("accepted");

      expect(rejected.status).toBe(200);
      expect(rejected.body.status).toBe("rejected");

      const response = await request(app)
        .get("/api/usage/records")
        .set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.pagination.total).toBe(2);

      expect(response.body.records).toEqual(
        jasmine.arrayWithExactContents([
          jasmine.objectContaining({
            id: accepted.body.id,
            status: "accepted",
            rejectionReason: null,
          }),
          jasmine.objectContaining({
            id: rejected.body.id,
            status: "rejected",
            rejectionReason: "user_request_limit",
          }),
        ]),
      );
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
