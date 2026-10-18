import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { accounts } from "../db/schema/accounts.js";

export async function insertAccount(data: typeof accounts.$inferInsert) {
  const result = await db.insert(accounts).values(data).returning({
    id: accounts.id,
    name: accounts.name,
    planId: accounts.planId,
    createdAt: accounts.createdAt,
  });

  const account = result[0];

  return account;
}

// Update an account's plan.
export async function updatePlanAccount(accountId: string, planId: string) {
  const result = await db
    .update(accounts)
    .set({ planId })
    .where(eq(accounts.id, accountId))
    .returning({
      id: accounts.id,
      name: accounts.name,
      planId: accounts.planId,
      createdAt: accounts.createdAt,
    });

  return result[0] ?? null;
}

// Find an account by its API key hash.
export async function findAccountByApiKeyHash(apiKeyHash: string) {
  const result = await db
    .select()
    .from(accounts)
    .where(eq(accounts.apiKeyHash, apiKeyHash))
    .limit(1);

  return result[0] ?? null;
}
