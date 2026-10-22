import { and, eq, isNull, type SQL } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { accounts } from "../../db/schema/accounts.js";
import { plans } from "../../db/schema/plans.js";

type Plan = typeof plans.$inferSelect;
type NewPlan = typeof plans.$inferInsert;

export type FindPlansOptions = Partial<
  Pick<Plan, "id" | "planType" | "ownerAccountId">
>;

type UpdatePlanData = Partial<
  Pick<NewPlan, "name" | "monthlyAllowance" | "maxUnitsPerRequest">
>;

///////////////////////////////////////////////////////
// Detect duplicate private plan names, including wrapped errors
///////////////////////////////////////////////////////
function isDuplicatePrivatePlanError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (
    "code" in error &&
    error.code === "23505" &&
    "constraint_name" in error &&
    error.constraint_name === "plans_account_name_type_unique"
  ) {
    return true;
  }

  return error.cause !== undefined && isDuplicatePrivatePlanError(error.cause);
}

///////////////////////////////////////////////////////
// Create a new plan
///////////////////////////////////////////////////////
export async function insertPlan(data: NewPlan): Promise<Plan> {
  try {
    const result = await db.insert(plans).values(data).returning();

    const plan = result[0];

    if (!plan) {
      throw new Error("Failed to insert plan");
    }

    return plan;
  } catch (error) {
    if (isDuplicatePrivatePlanError(error)) {
      throw new Error("Plan name already exists for this account and type", {
        cause: error,
      });
    }

    throw error;
  }
}

///////////////////////////////////////////////////////
// Find plans using the provided filters
///////////////////////////////////////////////////////
export async function findPlans(options: FindPlansOptions): Promise<Plan[]> {
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

///////////////////////////////////////////////////////
// Update a private plan after locking its owner account
///////////////////////////////////////////////////////
export async function updatePrivatePlan(
  id: string,
  accountId: string,
  data: UpdatePlanData,
): Promise<Plan | null> {
  try {
    return await db.transaction(async (tx) => {
      const lockedAccounts = await tx
        .select({
          id: accounts.id,
        })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .for("update");

      if (!lockedAccounts[0]) {
        return null;
      }

      const result = await tx
        .update(plans)
        .set(data)
        .where(and(eq(plans.id, id), eq(plans.ownerAccountId, accountId)))
        .returning();

      return result[0] ?? null;
    });
  } catch (error) {
    if (isDuplicatePrivatePlanError(error)) {
      throw new Error("Plan name already exists for this account and type", {
        cause: error,
      });
    }

    throw error;
  }
}
