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
// Verify consumption requires a valid account API key
///////////////////////////////////////////////////////
describe("Consumption authentication", () => {
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
