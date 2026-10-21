import { randomUUID } from "node:crypto";
import request from "supertest";

import app from "../../../src/app.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

import { expectNoConsumption } from "../../helpers/usage-assertions.js";

///////////////////////////////////////////////////////
// Validate consumption input without changing stored data
///////////////////////////////////////////////////////
describe("Consumption input validation", () => {
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
});
