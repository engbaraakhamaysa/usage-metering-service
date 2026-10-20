import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify invalid consumption does not change account data
///////////////////////////////////////////////////////
async function expectNoConsumption(
  apiKey: string,
  userId: string,
): Promise<void> {
  const accountUsage = await request(app)
    .get("/api/usage/account")
    .set("x-api-key", apiKey);

  const userUsage = await request(app)
    .get(`/api/usage/users/${userId}`)
    .set("x-api-key", apiKey);

  const records = await request(app)
    .get("/api/usage/records")
    .set("x-api-key", apiKey);

  expect(accountUsage.status).toBe(200);
  expect(accountUsage.body.usedUnits).toBe(0);

  expect(userUsage.status).toBe(200);
  expect(userUsage.body.usedUnits).toBe(0);

  expect(records.status).toBe(200);
  expect(records.body.pagination.total).toBe(0);
  expect(records.body.records).toEqual([]);
}

///////////////////////////////////////////////////////
// Validate consumption input and account ownership
///////////////////////////////////////////////////////
describe("Consumption validation and authentication", () => {
  it("rejects consumption for another account's user", async () => {
    const owner = await createTestAccount();

    try {
      const other = await createTestAccount();

      try {
        const ownedUser = await createTestUser(owner.account.id);
        const otherUser = await createTestUser(other.account.id);

        const response = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", other.apiKey)
          .send({
            userId: ownedUser.id,
            requestId: randomUUID(),
            requestedUnits: 5,
          });

        expect(response.status).toBe(404);

        await expectNoConsumption(owner.apiKey, ownedUser.id);
        await expectNoConsumption(other.apiKey, otherUser.id);
      } finally {
        await deleteTestAccount(other.account.id);
      }
    } finally {
      await deleteTestAccount(owner.account.id);
    }
  });

  it("rejects consumption for a user that does not exist", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const response = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: randomUUID(),
          requestId: randomUUID(),
          requestedUnits: 5,
        });

      expect(response.status).toBe(404);

      await expectNoConsumption(apiKey, user.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects invalid unit values without recording consumption", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const invalidUnits = [0, -1, 1.5, 2_147_483_648, "5", null];

      for (const requestedUnits of invalidUnits) {
        const response = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", apiKey)
          .send({
            userId: user.id,
            requestId: randomUUID(),
            requestedUnits,
          });

        expect(response.status)
          .withContext(`requestedUnits=${JSON.stringify(requestedUnits)}`)
          .toBe(400);
      }

      await expectNoConsumption(apiKey, user.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects missing required fields", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const invalidBodies = [
        {},
        {
          requestId: randomUUID(),
          requestedUnits: 5,
        },
        {
          userId: user.id,
          requestedUnits: 5,
        },
        {
          userId: user.id,
          requestId: randomUUID(),
        },
      ];

      for (const body of invalidBodies) {
        const response = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", apiKey)
          .send(body);

        expect(response.status).withContext(JSON.stringify(body)).toBe(400);
      }

      await expectNoConsumption(apiKey, user.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects invalid user and request ID formats", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const invalidBodies = [
        {
          userId: "not-a-uuid",
          requestId: randomUUID(),
          requestedUnits: 5,
        },
        {
          userId: user.id,
          requestId: "not-a-uuid",
          requestedUnits: 5,
        },
      ];

      for (const body of invalidBodies) {
        const response = await request(app)
          .post("/api/usage/consume")
          .set("x-api-key", apiKey)
          .send(body);

        expect(response.status).withContext(JSON.stringify(body)).toBe(400);
      }

      await expectNoConsumption(apiKey, user.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects consumption without an API key", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const response = await request(app).post("/api/usage/consume").send({
        userId: user.id,
        requestId: randomUUID(),
        requestedUnits: 5,
      });

      expect(response.status).toBe(401);

      await expectNoConsumption(apiKey, user.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("rejects consumption with an invalid API key", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const response = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", randomUUID())
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 5,
        });

      expect(response.status).toBe(401);

      await expectNoConsumption(apiKey, user.id);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
