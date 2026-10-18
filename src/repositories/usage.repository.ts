import { and, eq, isNull, desc, count, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { accounts } from "../db/schema/accounts.js";
import { users } from "../db/schema/users.js";
import { plans } from "../db/schema/plans.js";
import { usage } from "../db/schema/usage.js";
import { usageRecords } from "../db/schema/usage-records.js";

// ============================================================
// Types
// ============================================================

export type ConsumeUsageInput = {
  accountId: string;
  userId: string;
  requestId: string;
  requestedUnits: number;
  periodStart: string;
};

export type UsageRejectionReason =
  | "account_request_limit"
  | "account_monthly_limit"
  | "user_request_limit"
  | "user_monthly_limit";

export type ConsumeUsageResult = {
  record: typeof usageRecords.$inferSelect;
  duplicate: boolean;
};

// ============================================================
// Account and User Plans
// ============================================================

// Get an account and its current plan limits
export async function findAccountWithPlan(accountId: string) {
  const result = await db
    .select({
      id: accounts.id,
      planId: accounts.planId,
      planType: accounts.planType,
      monthlyAllowance: plans.monthlyAllowance,
      maxUnitsPerRequest: plans.maxUnitsPerRequest,
    })
    .from(accounts)
    .innerJoin(
      plans,
      and(eq(accounts.planId, plans.id), eq(accounts.planType, plans.planType)),
    )
    .where(eq(accounts.id, accountId))
    .limit(1);

  return result[0] ?? null;
}

// Get a user belonging to an account and the user's current plan
export async function findUserWithPlan(userId: string, accountId: string) {
  const result = await db
    .select({
      id: users.id,
      accountId: users.accountId,
      planId: users.planId,
      planType: users.planType,
      monthlyAllowance: plans.monthlyAllowance,
      maxUnitsPerRequest: plans.maxUnitsPerRequest,
    })
    .from(users)
    .innerJoin(
      plans,
      and(eq(users.planId, plans.id), eq(users.planType, plans.planType)),
    )
    .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
    .limit(1);

  return result[0] ?? null;
}

// ============================================================
// Usage Queries
// ============================================================

// Get the account's usage for a specific month
export async function findAccountUsage(accountId: string, periodStart: string) {
  const result = await db
    .select()
    .from(usage)
    .where(
      and(
        eq(usage.accountId, accountId),
        isNull(usage.userId),
        eq(usage.periodStart, periodStart),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

// Get a user's usage for a specific month
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

// ============================================================
// Usage Records Queries
// ============================================================

// Get usage records with pagination
export async function findUsageRecords(
  accountId: string,
  limit: number,
  offset: number,
) {
  return db
    .select()
    .from(usageRecords)
    .where(eq(usageRecords.accountId, accountId))
    .orderBy(desc(usageRecords.createdAt), desc(usageRecords.id))
    .limit(limit)
    .offset(offset);
}

// Count usage records belonging to an account
export async function countUsageRecords(accountId: string) {
  const result = await db
    .select({
      total: count(),
    })
    .from(usageRecords)
    .where(eq(usageRecords.accountId, accountId));

  return result[0]?.total ?? 0;
}

// Get one usage record belonging to an account
export async function findUsageRecordById(accountId: string, recordId: string) {
  const result = await db
    .select()
    .from(usageRecords)
    .where(
      and(eq(usageRecords.accountId, accountId), eq(usageRecords.id, recordId)),
    )
    .limit(1);

  return result[0] ?? null;
}

// ============================================================
// Consume Usage Transaction
// ============================================================

export async function consumeUsageTransaction(
  input: ConsumeUsageInput,
): Promise<ConsumeUsageResult> {
  const { accountId, userId, requestId, requestedUnits, periodStart } = input;

  return db.transaction(async (tx) => {
    // --------------------------------------------------------
    // 1. Lock the account row
    // --------------------------------------------------------

    // All consumption requests for the same account are
    // serialized through this lock.
    const lockedAccount = await tx
      .select({
        id: accounts.id,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .for("update")
      .limit(1);

    if (!lockedAccount[0]) {
      throw new Error("Account not found");
    }

    // --------------------------------------------------------
    // 2. Check idempotency
    // --------------------------------------------------------

    // The same request must not consume units twice.
    const existingRecords = await tx
      .select()
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.accountId, accountId),
          eq(usageRecords.requestId, requestId),
        ),
      )
      .limit(1);

    const existingRecord = existingRecords[0];

    if (existingRecord) {
      // Reusing an idempotency key with a different payload
      // is an error.
      if (
        existingRecord.userId !== userId ||
        existingRecord.requestedUnits !== requestedUnits
      ) {
        throw new Error("Idempotency key reused with different request");
      }

      return {
        record: existingRecord,
        duplicate: true,
      };
    }

    // --------------------------------------------------------
    // 3. Load the account plan
    // --------------------------------------------------------

    const accountPlanResult = await tx
      .select({
        id: accounts.id,
        planId: accounts.planId,
        planType: accounts.planType,
        monthlyAllowance: plans.monthlyAllowance,
        maxUnitsPerRequest: plans.maxUnitsPerRequest,
      })
      .from(accounts)
      .innerJoin(
        plans,
        and(
          eq(accounts.planId, plans.id),
          eq(accounts.planType, plans.planType),
        ),
      )
      .where(eq(accounts.id, accountId))
      .limit(1);

    const accountPlan = accountPlanResult[0];

    if (!accountPlan) {
      throw new Error("Account plan not found");
    }

    // --------------------------------------------------------
    // 4. Load the user plan
    // --------------------------------------------------------

    const userPlanResult = await tx
      .select({
        id: users.id,
        accountId: users.accountId,
        planId: users.planId,
        planType: users.planType,
        monthlyAllowance: plans.monthlyAllowance,
        maxUnitsPerRequest: plans.maxUnitsPerRequest,
      })
      .from(users)
      .innerJoin(
        plans,
        and(eq(users.planId, plans.id), eq(users.planType, plans.planType)),
      )
      .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
      .limit(1);

    const userPlan = userPlanResult[0];

    if (!userPlan) {
      throw new Error("User not found");
    }

    // --------------------------------------------------------
    // 5. Read current monthly usage
    // --------------------------------------------------------

    const accountUsageResult = await tx
      .select()
      .from(usage)
      .where(
        and(
          eq(usage.accountId, accountId),
          isNull(usage.userId),
          eq(usage.periodStart, periodStart),
        ),
      )
      .limit(1);

    const accountUsage = accountUsageResult[0];

    const userUsageResult = await tx
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

    const userUsage = userUsageResult[0];

    const accountUsedUnits = accountUsage?.usedUnits ?? 0;
    const userUsedUnits = userUsage?.usedUnits ?? 0;

    // --------------------------------------------------------
    // 6. Validate all four limits
    // --------------------------------------------------------

    let rejectionReason: UsageRejectionReason | null = null;

    if (requestedUnits > accountPlan.maxUnitsPerRequest) {
      rejectionReason = "account_request_limit";
    } else if (
      accountUsedUnits + requestedUnits >
      accountPlan.monthlyAllowance
    ) {
      rejectionReason = "account_monthly_limit";
    } else if (requestedUnits > userPlan.maxUnitsPerRequest) {
      rejectionReason = "user_request_limit";
    } else if (userUsedUnits + requestedUnits > userPlan.monthlyAllowance) {
      rejectionReason = "user_monthly_limit";
    }

    // --------------------------------------------------------
    // 7. Record rejected requests without increasing usage
    // --------------------------------------------------------

    if (rejectionReason !== null) {
      const rejectedRecords = await tx
        .insert(usageRecords)
        .values({
          accountId,
          userId,
          requestId,
          requestedUnits,
          status: "rejected",
          rejectionReason,
        })
        .returning();

      const record = rejectedRecords[0];

      if (!record) {
        throw new Error("Failed to record rejected request");
      }

      return {
        record,
        duplicate: false,
      };
    }

    // --------------------------------------------------------
    // 8. Increase account usage
    // --------------------------------------------------------

    if (accountUsage) {
      await tx
        .update(usage)
        .set({
          usedUnits: sql`${usage.usedUnits} + ${requestedUnits}`,
          updatedAt: new Date(),
        })
        .where(eq(usage.id, accountUsage.id));
    } else {
      await tx.insert(usage).values({
        accountId,
        userId: null,
        periodStart,
        usedUnits: requestedUnits,
      });
    }

    // --------------------------------------------------------
    // 9. Increase user usage
    // --------------------------------------------------------

    if (userUsage) {
      await tx
        .update(usage)
        .set({
          usedUnits: sql`${usage.usedUnits} + ${requestedUnits}`,
          updatedAt: new Date(),
        })
        .where(eq(usage.id, userUsage.id));
    } else {
      await tx.insert(usage).values({
        accountId,
        userId,
        periodStart,
        usedUnits: requestedUnits,
      });
    }

    // --------------------------------------------------------
    // 10. Record the accepted request
    // --------------------------------------------------------

    const acceptedRecords = await tx
      .insert(usageRecords)
      .values({
        accountId,
        userId,
        requestId,
        requestedUnits,
        status: "accepted",
        rejectionReason: null,
      })
      .returning();

    const record = acceptedRecords[0];

    if (!record) {
      throw new Error("Failed to record accepted request");
    }

    // --------------------------------------------------------
    // 11. Commit the transaction
    // --------------------------------------------------------

    return {
      record,
      duplicate: false,
    };
  });
}
