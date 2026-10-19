import { eq } from "drizzle-orm";

import { db } from "../../db/client.js";
import { accounts } from "../../db/schema/accounts.js";

type Account = typeof accounts.$inferSelect;
type NewAccount = typeof accounts.$inferInsert;

export type AccountResult = Pick<
  Account,
  "id" | "name" | "planId" | "createdAt"
>;

// Return only these fields, excluding apiKeyHash.
const accountResultFields = {
  id: accounts.id,
  name: accounts.name,
  planId: accounts.planId,
  createdAt: accounts.createdAt,
};

///////////////////////////////////////////////////////
// Create a new account
///////////////////////////////////////////////////////
export async function insertAccount(data: NewAccount): Promise<AccountResult> {
  const result = await db
    .insert(accounts)
    .values(data)
    .returning(accountResultFields);

  const account = result[0];

  if (!account) {
    throw new Error("Failed to insert account");
  }

  return account;
}

///////////////////////////////////////////////////////
// Update an account's plan
///////////////////////////////////////////////////////
export async function updatePlanAccount(
  accountId: string,
  planId: string,
): Promise<AccountResult | null> {
  const result = await db
    .update(accounts)
    .set({ planId })
    .where(eq(accounts.id, accountId))
    .returning(accountResultFields);

  return result[0] ?? null;
}

///////////////////////////////////////////////////////
// Find an account by its API key hash
///////////////////////////////////////////////////////
export async function findAccountByApiKeyHash(
  apiKeyHash: string,
): Promise<Account | null> {
  const result = await db
    .select()
    .from(accounts)
    .where(eq(accounts.apiKeyHash, apiKeyHash))
    .limit(1);

  return result[0] ?? null;
}
