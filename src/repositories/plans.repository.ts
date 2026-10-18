import { and, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { plans } from "../db/schema/plans.js";

export type FindPlansOptions = {
  id?: string;
  planType?: "account" | "user";
  ownerAccountId?: string | null;
};

// Create new plan
export async function insertPlan(data: typeof plans.$inferInsert) {
  try {
    const result = await db.insert(plans).values(data).returning();

    console.log("Plan created successfully:", result[0]);
    return result[0];
  } catch (error) {
    console.error("Failed to create plan:", error);
    return null;
  }
}

// Find plans using the provided filters
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
