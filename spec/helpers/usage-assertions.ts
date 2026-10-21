import request from "supertest";

import app from "../../src/app.js";

///////////////////////////////////////////////////////
// Verify a fresh account and user have no consumption
///////////////////////////////////////////////////////
export async function expectNoConsumption(
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
