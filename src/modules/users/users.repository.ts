import { and, eq } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { users } from "../../db/schema/users.js";

type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;

export type UserResult = Pick<
  User,
  "id" | "name" | "accountId" | "planId" | "createdAt"
>;

// Use the same result fields for reads, creation, and updates.
const userResultFields = {
  id: users.id,
  name: users.name,
  accountId: users.accountId,
  planId: users.planId,
  createdAt: users.createdAt,
};

///////////////////////////////////////////////////////
// Create a new user
///////////////////////////////////////////////////////
export async function insertUser(data: NewUser): Promise<UserResult> {
  const result = await db
    .insert(users)
    .values(data)
    .returning(userResultFields);

  const user = result[0];

  if (!user) {
    throw new Error("Failed to insert user");
  }

  return user;
}

///////////////////////////////////////////////////////
// Find all users belonging to a specific account
///////////////////////////////////////////////////////
export async function findUsersByAccountId(
  accountId: string,
): Promise<UserResult[]> {
  return db
    .select(userResultFields)
    .from(users)
    .where(eq(users.accountId, accountId));
}

///////////////////////////////////////////////////////
// Find a specific user belonging to a specific account
///////////////////////////////////////////////////////
export async function findUserById(
  userId: string,
  accountId: string,
): Promise<UserResult | null> {
  const result = await db
    .select(userResultFields)
    .from(users)
    .where(and(eq(users.id, userId), eq(users.accountId, accountId)));

  return result[0] ?? null;
}

///////////////////////////////////////////////////////
// Update a user's plan within a specific account
///////////////////////////////////////////////////////
export async function updateUserPlan(
  userId: string,
  accountId: string,
  planId: string,
): Promise<UserResult | null> {
  const result = await db
    .update(users)
    .set({ planId })
    .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
    .returning(userResultFields);

  return result[0] ?? null;
}
