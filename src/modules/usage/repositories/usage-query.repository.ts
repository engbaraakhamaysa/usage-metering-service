import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../../../db/connection.js";
import { accounts } from "../../../db/schema/accounts.js";
import { users } from "../../../db/schema/users.js";
import { plans } from "../../../db/schema/plans.js";
import { usage } from "../../../db/schema/usage.js";

///////////////////////////////////////////////////////
// Define usage query result types
///////////////////////////////////////////////////////
type Plan = typeof plans.$inferSelect;

type CurrentPlan = Pick<
  Plan,
  "id" | "name" | "monthlyAllowance" | "maxUnitsPerRequest"
>;

export type AccountUsageDetails = {
  accountId: string;
  usedUnits: number;
  currentPlan: CurrentPlan;
};

export type UserUsageDetails = AccountUsageDetails & {
  userId: string;
};

///////////////////////////////////////////////////////
// Find account usage with its current plan
///////////////////////////////////////////////////////
export async function findAccountUsage(
  accountId: string,
  periodStart: string,
): Promise<AccountUsageDetails | null> {
  const result = await db
    .select({
      accountId: accounts.id,
      usedUnits: sql<number>`
        COALESCE(${usage.usedUnits}, 0)
      `.mapWith(Number),
      currentPlan: {
        id: plans.id,
        name: plans.name,
        monthlyAllowance: plans.monthlyAllowance,
        maxUnitsPerRequest: plans.maxUnitsPerRequest,
      },
    })
    .from(accounts)
    .innerJoin(
      plans,
      and(eq(accounts.planId, plans.id), eq(accounts.planType, plans.planType)),
    )
    .leftJoin(
      usage,
      and(
        eq(usage.accountId, accounts.id),
        isNull(usage.userId),
        eq(usage.periodStart, periodStart),
      ),
    )
    .where(eq(accounts.id, accountId));

  return result[0] ?? null;
}

///////////////////////////////////////////////////////
// Find user usage with its current plan within an account
///////////////////////////////////////////////////////
export async function findUserUsage(
  accountId: string,
  userId: string,
  periodStart: string,
): Promise<UserUsageDetails | null> {
  const result = await db
    .select({
      accountId: users.accountId,
      userId: users.id,
      usedUnits: sql<number>`
        COALESCE(${usage.usedUnits}, 0)
      `.mapWith(Number),
      currentPlan: {
        id: plans.id,
        name: plans.name,
        monthlyAllowance: plans.monthlyAllowance,
        maxUnitsPerRequest: plans.maxUnitsPerRequest,
      },
    })
    .from(users)
    .innerJoin(
      plans,
      and(eq(users.planId, plans.id), eq(users.planType, plans.planType)),
    )
    .leftJoin(
      usage,
      and(
        eq(usage.accountId, users.accountId),
        eq(usage.userId, users.id),
        eq(usage.periodStart, periodStart),
      ),
    )
    .where(and(eq(users.id, userId), eq(users.accountId, accountId)));

  return result[0] ?? null;
}
