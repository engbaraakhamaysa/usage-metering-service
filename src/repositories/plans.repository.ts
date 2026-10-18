import { and, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { plans } from "../db/schema/plans.js";

export type FindPlansOptions = {
  id?: string;
  planType?: "account" | "user";
  ownerAccountId?: string | null;
};

// Create a new plan.
export async function insertPlan(data: typeof plans.$inferInsert) {
  const result = await db.insert(plans).values(data).returning();

  return result[0];
}

// Find plans using the provided filters.
export async function findPlans(options: FindPlansOptions) {
  const conditions: SQL[] = [];

  if (options.id !== undefined) {
    conditions.push(eq(plans.id, options.id));
  }

  if (options.planType !== undefined) {
    conditions.push(eq(plans.planType, options.planType));
  }

  if (options.ownerAccountId === null) {
    conditions.push(isNull(plans.ownerAccountId));
  } else if (options.ownerAccountId !== undefined) {
    conditions.push(eq(plans.ownerAccountId, options.ownerAccountId));
  }

  if (conditions.length === 0) {
    throw new Error("At least one search condition is required");
  }

  return db
    .select()
    .from(plans)
    .where(and(...conditions));
}

// Update a private plan owned by a specific account.
export async function updatePrivatePlan(
  id: string,
  accountId: string,
  data: Partial<
    Pick<
      typeof plans.$inferInsert,
      "name" | "monthlyAllowance" | "maxUnitsPerRequest"
    >
  >,
) {
  const result = await db
    .update(plans)
    .set(data)
    .where(and(eq(plans.id, id), eq(plans.ownerAccountId, accountId)))
    .returning();

  return result[0] ?? null;
}
