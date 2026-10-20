import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../src/db/connection.js";
import { accounts } from "../../src/db/schema/accounts.js";
import { users } from "../../src/db/schema/users.js";
import { plans } from "../../src/db/schema/plans.js";
import { usage } from "../../src/db/schema/usage.js";
import { usageRecords } from "../../src/db/schema/usage-records.js";

import { generateApiKey } from "../../src/utils/api-key.js";

type Plan = typeof plans.$inferSelect;
type Account = typeof accounts.$inferSelect;
type User = typeof users.$inferSelect;

type TestAccount = {
  account: Account;
  apiKey: string;
};

///////////////////////////////////////////////////////
// Find a predefined public plan
///////////////////////////////////////////////////////
export async function getPublicPlan(
  name: string,
  planType: Plan["planType"],
): Promise<Plan> {
  const result = await db
    .select()
    .from(plans)
    .where(
      and(
        eq(plans.name, name),
        eq(plans.planType, planType),
        isNull(plans.ownerAccountId),
      ),
    );

  const plan = result[0];

  if (!plan) {
    throw new Error(`Public plan not found: ${name} (${planType})`);
  }

  return plan;
}

///////////////////////////////////////////////////////
// Create an account with a usable API key
///////////////////////////////////////////////////////
export async function createTestAccount(
  planName = "Starter",
): Promise<TestAccount> {
  const plan = await getPublicPlan(planName, "account");
  const { apiKey, apiKeyHash } = generateApiKey();

  const result = await db
    .insert(accounts)
    .values({
      name: `Test Account ${randomUUID()}`,
      apiKeyHash,
      planId: plan.id,
    })
    .returning();

  const account = result[0];

  if (!account) {
    throw new Error("Failed to create test account");
  }

  return {
    account,
    apiKey,
  };
}

///////////////////////////////////////////////////////
// Create a user belonging to a test account
///////////////////////////////////////////////////////
export async function createTestUser(
  accountId: string,
  planName = "Basic",
): Promise<User> {
  const plan = await getPublicPlan(planName, "user");

  const result = await db
    .insert(users)
    .values({
      name: `Test User ${randomUUID()}`,
      accountId,
      planId: plan.id,
    })
    .returning();

  const user = result[0];

  if (!user) {
    throw new Error("Failed to create test user");
  }

  return user;
}

///////////////////////////////////////////////////////
// Delete a test account and its related test data
///////////////////////////////////////////////////////
export async function deleteTestAccount(accountId: string): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Test cleanup requires NODE_ENV=test");
  }

  const publicPlan = await getPublicPlan("Starter", "account");

  await db.transaction(async (tx) => {
    await tx.delete(usageRecords).where(eq(usageRecords.accountId, accountId));

    await tx.delete(usage).where(eq(usage.accountId, accountId));

    await tx.delete(users).where(eq(users.accountId, accountId));

    // Remove the account's reference to any private plan.
    await tx
      .update(accounts)
      .set({ planId: publicPlan.id })
      .where(eq(accounts.id, accountId));

    await tx.delete(plans).where(eq(plans.ownerAccountId, accountId));

    await tx.delete(accounts).where(eq(accounts.id, accountId));
  });
}
