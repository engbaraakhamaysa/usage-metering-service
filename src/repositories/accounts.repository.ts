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
