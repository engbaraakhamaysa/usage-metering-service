import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify usage record isolation, authentication, and IDs
///////////////////////////////////////////////////////
describe("Usage records access and validation", () => {
  it("does not expose another account's records", async () => {
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

        const otherHistory = await request(app)
          .get("/api/usage/records")
          .set("x-api-key", other.apiKey);

        expect(otherHistory.status).toBe(200);
        expect(otherHistory.body.records).toEqual([]);
        expect(otherHistory.body.pagination.total).toBe(0);

        const forbidden = await request(app)
          .get(`/api/usage/records/${consumed.body.id}`)
          .set("x-api-key", other.apiKey);

        expect(forbidden.status).toBe(404);

        const ownedRecord = await request(app)
          .get(`/api/usage/records/${consumed.body.id}`)
          .set("x-api-key", owner.apiKey);

        expect(ownedRecord.status).toBe(200);
        expect(ownedRecord.body.id).toBe(consumed.body.id);
        expect(ownedRecord.body.accountId).toBe(owner.account.id);
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });

  it("returns 404 for a record that does not exist", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get(`/api/usage/records/${randomUUID()}`)
        .set("x-api-key", apiKey);

      expect(response.status).toBe(404);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects an invalid record ID format", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const response = await request(app)
        .get("/api/usage/records/not-a-uuid")
        .set("x-api-key", apiKey);

      expect(response.status).toBe(400);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects history requests without an API key", async () => {
    const paths = ["/api/usage/records", `/api/usage/records/${randomUUID()}`];

    for (const path of paths) {
      const response = await request(app).get(path);

      expect(response.status).withContext(path).toBe(401);
    }
  });

  it("rejects history requests with an invalid API key", async () => {
    const paths = ["/api/usage/records", `/api/usage/records/${randomUUID()}`];

    for (const path of paths) {
      const response = await request(app)
        .get(path)
        .set("x-api-key", randomUUID());

      expect(response.status).withContext(path).toBe(401);
    }
  });
});
