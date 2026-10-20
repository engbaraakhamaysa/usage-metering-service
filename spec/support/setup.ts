import { sql } from "drizzle-orm";

import { db, client } from "../../src/db/connection.js";

///////////////////////////////////////////////////////
// Verify the test environment before running tests
///////////////////////////////////////////////////////
beforeAll(async () => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Tests must run with NODE_ENV=test");
  }

  const result = await db.execute(sql`
    SELECT current_database() AS database
  `);

  if (result[0]?.database !== "usage_metering_test") {
    throw new Error("Tests must use the usage_metering_test database");
  }
});

///////////////////////////////////////////////////////
// Close the database connection after all tests
///////////////////////////////////////////////////////
afterAll(async () => {
  await client.end();
});
