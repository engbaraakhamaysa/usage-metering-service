import { randomUUID } from "node:crypto";
import { mkdir, access, writeFile } from "node:fs/promises";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db, client } from "../src/db/connection.js";
import { accounts } from "../src/db/schema/accounts.js";
import { users } from "../src/db/schema/users.js";
import { plans } from "../src/db/schema/plans.js";

import { generateApiKey } from "../src/utils/api-key.js";

const fixturesPath = new URL("./data/fixtures.json", import.meta.url);
const runId = randomUUID();

///////////////////////////////////////////////////////
// Prepare isolated accounts for performance testing
///////////////////////////////////////////////////////
async function prepare(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Performance preparation requires NODE_ENV=test");
  }

  const database = await db.execute(sql`
    SELECT current_database() AS database
  `);

  if (database[0]?.database !== "usage_metering_test") {
    throw new Error("Performance preparation requires usage_metering_test");
  }

  const fileExists = await access(fixturesPath).then(
    () => true,
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return false;
      }

      throw error;
    },
  );

  if (fileExists) {
    throw new Error(
      "Performance fixtures already exist. Clean up the previous run first.",
    );
  }

  await mkdir(new URL("./data/", import.meta.url), {
    recursive: true,
  });

  const fixtures = await db.transaction(async (tx) => {
    const publicPlans = await tx
      .select()
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
      throw new Error("Starter plan is missing. Run db:seed:test first.");
    }

    const preparedAccounts: {
      accountId: string;
      userId: string;
      apiKey: string;
      accountPlanId: string;
      userPlanId: string;
    }[] = [];

    for (let index = 0; index < 10; index++) {
      const { apiKey, apiKeyHash } = generateApiKey();

      const insertedAccounts = await tx
        .insert(accounts)
        .values({
          name: `Performance ${runId} Account ${index + 1}`,
          apiKeyHash,
          planId: starter.id,
        })
        .returning();

      const account = insertedAccounts[0];

      if (!account) {
        throw new Error("Failed to create performance account");
      }

      const insertedPlans = await tx
        .insert(plans)
        .values([
          {
            name: "Performance Account Plan",
            planType: "account",
            monthlyAllowance: 2_000_000_000,
            maxUnitsPerRequest: 1_000,
            ownerAccountId: account.id,
          },
          {
            name: "Performance User Plan",
            planType: "user",
            monthlyAllowance: 2_000_000_000,
            maxUnitsPerRequest: 1_000,
            ownerAccountId: account.id,
          },
        ])
        .returning();

      const accountPlan = insertedPlans.find(
        (plan) => plan.planType === "account",
      );

      const userPlan = insertedPlans.find((plan) => plan.planType === "user");

      if (!accountPlan || !userPlan) {
        throw new Error("Failed to create performance plans");
      }

      await tx
        .update(accounts)
        .set({ planId: accountPlan.id })
        .where(eq(accounts.id, account.id));

      const insertedUsers = await tx
        .insert(users)
        .values({
          name: "Performance User",
          accountId: account.id,
          planId: userPlan.id,
        })
        .returning();

      const user = insertedUsers[0];

      if (!user) {
        throw new Error("Failed to create performance user");
      }

      preparedAccounts.push({
        accountId: account.id,
        userId: user.id,
        apiKey,
        accountPlanId: accountPlan.id,
        userPlanId: userPlan.id,
      });
    }

    return {
      runId,
      database: "usage_metering_test",
      baseUrl: "http://localhost:3001",
      accounts: preparedAccounts,
    };
  });

  await writeFile(fixturesPath, JSON.stringify(fixtures, null, 2), {
    flag: "wx",
    mode: 0o600,
  });

  console.log(`Prepared ${fixtures.accounts.length} performance accounts.`);
  console.log(`Run ID: ${runId}`);
}

try {
  await prepare();
} catch (error) {
  console.error("Failed to prepare performance data:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
