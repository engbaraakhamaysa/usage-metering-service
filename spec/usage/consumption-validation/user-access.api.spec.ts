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
// Verify consumption respects user ownership and existence
///////////////////////////////////////////////////////
describe("Consumption user access", () => {
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
});
