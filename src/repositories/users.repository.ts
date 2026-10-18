import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";

// Create a new user.
export async function insertUser(data: typeof users.$inferInsert) {
  const result = await db.insert(users).values(data).returning({
    id: users.id,
    name: users.name,
    accountId: users.accountId,
    planId: users.planId,
    createdAt: users.createdAt,
  });

  return result[0];
}

// Find all users belonging to a specific account.
export async function findUsersByAccountId(accountId: string) {
  return db.select().from(users).where(eq(users.accountId, accountId));
}

// Find a specific user belonging to a specific account.
export async function findUserById(userId: string, accountId: string) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
    .limit(1);

  return result[0] ?? null;
}

// Update a user's plan.
export async function updateUserPlan(
  userId: string,
  accountId: string,
  planId: string,
) {
  const result = await db
    .update(users)
    .set({ planId })
    .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
    .returning({
      id: users.id,
      name: users.name,
      accountId: users.accountId,
      planId: users.planId,
      createdAt: users.createdAt,
    });

  return result[0] ?? null;
}

// Update a user's information.
export async function updateUser(
  userId: string,
  accountId: string,
  data: Partial<Pick<typeof users.$inferInsert, "name">>,
) {
  const result = await db
    .update(users)
    .set(data)
    .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
    .returning({
      id: users.id,
      name: users.name,
      accountId: users.accountId,
      planId: users.planId,
      createdAt: users.createdAt,
    });

  return result[0] ?? null;
}
