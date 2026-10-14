import { db } from "../db/client.js";
import { accounts } from "../db/schema/accounts.js";

export async function createAccount(data: typeof accounts.$inferInsert) {
  const [account] = await db.insert(accounts).values(data).returning();

  return account;
}

export async function getAllAccounts() {
  return await db.select().from(accounts);
}
