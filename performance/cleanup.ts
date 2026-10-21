import { readFile, unlink } from "node:fs/promises";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db, client } from "../src/db/connection.js";
import { accounts } from "../src/db/schema/accounts.js";
import { users } from "../src/db/schema/users.js";
import { plans } from "../src/db/schema/plans.js";
import { usage } from "../src/db/schema/usage.js";
import { usageRecords } from "../src/db/schema/usage-records.js";

const fixturesPath = new URL("./data/fixtures.json", import.meta.url);

const fixturesSchema = z.object({
  runId: z.uuid(),
  database: z.literal("usage_metering_test"),
  accounts: z
    .array(
      z.object({
        accountId: z.uuid(),
      }),
    )
    .min(1),
});

///////////////////////////////////////////////////////
// Remove only accounts belonging to this performance run
///////////////////////////////////////////////////////
async function cleanup(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Performance cleanup requires NODE_ENV=test");
  }

  const database = await db.execute(sql`
    SELECT current_database() AS database
  `);

  if (database[0]?.database !== "usage_metering_test") {
    throw new Error("Cleanup requires usage_metering_test");
  }

  const fixtures = fixturesSchema.parse(
    JSON.parse(await readFile(fixturesPath, "utf8")),
  );

  await db.transaction(async (tx) => {
    const publicPlans = await tx
      .select({ id: plans.id })
      .from(plans)
      .where(
        and(
          eq(plans.name, "Starter"),
          eq(plans.planType, "account"),
          isNull(plans.ownerAccountId),
        ),
      );

    const starter = publicPlans[0];

    if (!starter) {
      throw new Error("Public Starter account plan not found");
    }

    for (const { accountId } of fixtures.accounts) {
      const result = await tx
        .select({
          id: accounts.id,
          name: accounts.name,
        })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .for("update");

      const account = result[0];

      // Allow retrying cleanup after database deletion succeeded.
      if (!account) {
        continue;
      }

      if (!account.name.startsWith(`Performance ${fixtures.runId} Account `)) {
        throw new Error("Account does not belong to this performance run");
      }

      await tx
        .delete(usageRecords)
        .where(eq(usageRecords.accountId, accountId));

      await tx.delete(usage).where(eq(usage.accountId, accountId));

      await tx.delete(users).where(eq(users.accountId, accountId));

      // Release the reference to the account's private plan.
      await tx
        .update(accounts)
        .set({ planId: starter.id })
        .where(eq(accounts.id, accountId));

      await tx.delete(plans).where(eq(plans.ownerAccountId, accountId));

      await tx.delete(accounts).where(eq(accounts.id, accountId));
    }
  });

  await unlink(fixturesPath);

  console.log("Performance data and fixtures file removed.");
}

try {
  await cleanup();
} catch (error) {
  console.error("Performance cleanup failed:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
