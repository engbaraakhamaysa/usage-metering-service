import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { accounts } from "../db/schema/accounts.js";
import { users } from "../db/schema/users.js";
import { plans } from "../db/schema/plans.js";
import { usage } from "../db/schema/usage.js";

// Get an account by ID with its plan
export async function findAccountWithPlan(accountId: string) {
  const result = await db
    .select({
      id: accounts.id,
      planId: accounts.planId,
      monthlyAllowance: plans.monthlyAllowance,
      maxUnitsPerRequest: plans.maxUnitsPerRequest,
    })
    .from(accounts)
    .innerJoin(plans, eq(accounts.planId, plans.id))
    .where(eq(accounts.id, accountId))
    .limit(1);

  return result[0] ?? null;
}

// Get a user by ID with its plan
export async function findUserWithPlan(userId: string) {
  const result = await db
    .select({
      id: users.id,
      accountId: users.accountId,
      planId: users.planId,
      monthlyAllowance: plans.monthlyAllowance,
      maxUnitsPerRequest: plans.maxUnitsPerRequest,
    })
    .from(users)
    .innerJoin(plans, eq(users.planId, plans.id))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] ?? null;
}

// Get account usage for a specific period
export async function findAccountUsage(accountId: string, periodStart: string) {
  const result = await db
    .select()
    .from(usage)
    .where(
      and(
        eq(usage.accountId, accountId),
        eq(usage.periodStart, periodStart),
        isNull(usage.userId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

// Get user usage for a specific period
export async function findUserUsage(
  accountId: string,
  userId: string,
  periodStart: string,
) {
  const result = await db
    .select()
    .from(usage)
    .where(
      and(
        eq(usage.accountId, accountId),
        eq(usage.userId, userId),
        eq(usage.periodStart, periodStart),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

// Create an account usage record if it does not exist
export async function createAccountUsage(
  accountId: string,
  periodStart: string,
) {
  const result = await db
    .insert(usage)
    .values({
      accountId,
      userId: null,
      periodStart,
      usedUnits: 0,
    })
    .onConflictDoNothing()
    .returning();

  if (result[0]) {
    return result[0];
  }

  return findAccountUsage(accountId, periodStart);
}

// Create a user usage record if it does not exist
export async function createUserUsage(
  accountId: string,
  userId: string,
  periodStart: string,
) {
  const result = await db
    .insert(usage)
    .values({
      accountId,
      userId,
      periodStart,
      usedUnits: 0,
    })
    .onConflictDoNothing()
    .returning();

  if (result[0]) {
    return result[0];
  }

  return findUserUsage(accountId, userId, periodStart);
}

// Increment usage units
export async function incrementUsage(usageId: string, units: number) {
  const result = await db
    .update(usage)
    .set({
      usedUnits: sql`${usage.usedUnits} + ${units}`,
      updatedAt: new Date(),
    })
    .where(eq(usage.id, usageId))
    .returning();

  return result[0] ?? null;
}
