import { readFile } from "node:fs/promises";
import { and, count, eq, isNull, sql } from "drizzle-orm";

import { db, client } from "../src/db/connection.js";
import { usage } from "../src/db/schema/usage.js";
import { usageRecords } from "../src/db/schema/usage-records.js";

type PerformanceFixtures = {
  accounts: {
    accountId: string;
    userId: string;
  }[];
};

///////////////////////////////////////////////////////
// Verify performance counters against accepted records
///////////////////////////////////////////////////////
async function verify(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Verification requires NODE_ENV=test");
  }

  const database = await db.execute(sql`
    SELECT current_database() AS database
  `);

  if (database[0]?.database !== "usage_metering_test") {
    throw new Error("Verification requires usage_metering_test");
  }

  const fixtures: PerformanceFixtures = JSON.parse(
    await readFile(new URL("./data/fixtures.json", import.meta.url), "utf8"),
  );

  const results: {
    account: number;
    accountUnits: number;
    userUnits: number;
    acceptedUnits: number;
    records: number;
    acceptedRecords: number;
    valid: boolean;
  }[] = [];

  for (const [index, fixture] of fixtures.accounts.entries()) {
    const { accountId, userId } = fixture;

    const accountRows = await db
      .select({
        usedUnits: usage.usedUnits,
      })
      .from(usage)
      .where(and(eq(usage.accountId, accountId), isNull(usage.userId)));

    const userRows = await db
      .select({
        usedUnits: usage.usedUnits,
      })
      .from(usage)
      .where(and(eq(usage.accountId, accountId), eq(usage.userId, userId)));

    const records = await db
      .select({
        total: count(),
      })
      .from(usageRecords)
      .where(eq(usageRecords.accountId, accountId));

    const accepted = await db
      .select({
        total: count(),
        units: sql<string>`
          COALESCE(SUM(${usageRecords.requestedUnits}), 0)
        `,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.accountId, accountId),
          eq(usageRecords.userId, userId),
          eq(usageRecords.status, "accepted"),
        ),
      );

    const accountUnits = accountRows.reduce(
      (total, row) => total + row.usedUnits,
      0,
    );

    const userUnits = userRows.reduce((total, row) => total + row.usedUnits, 0);

    const acceptedUnits = Number(accepted[0]?.units ?? 0);

    results.push({
      account: index + 1,
      accountUnits,
      userUnits,
      acceptedUnits,
      records: records[0]?.total ?? 0,
      acceptedRecords: accepted[0]?.total ?? 0,
      valid: accountUnits === acceptedUnits && userUnits === acceptedUnits,
    });
  }

  console.table(results);

  const totals = results.reduce(
    (total, row) => ({
      accountUnits: total.accountUnits + row.accountUnits,
      userUnits: total.userUnits + row.userUnits,
      acceptedUnits: total.acceptedUnits + row.acceptedUnits,
      records: total.records + row.records,
      acceptedRecords: total.acceptedRecords + row.acceptedRecords,
    }),
    {
      accountUnits: 0,
      userUnits: 0,
      acceptedUnits: 0,
      records: 0,
      acceptedRecords: 0,
    },
  );

  console.log("Totals:");
  console.table([totals]);

  if (results.some((row) => !row.valid)) {
    throw new Error("Usage counters do not match accepted units");
  }

  console.log("All performance account counters match accepted units.");
}

try {
  await verify();
} catch (error) {
  console.error("Performance verification failed:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
