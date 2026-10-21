import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { accounts } from "../../db/schema/accounts.js";
import { users } from "../../db/schema/users.js";
import { plans } from "../../db/schema/plans.js";
import { usage } from "../../db/schema/usage.js";
import { usageRecords } from "../../db/schema/usage-records.js";

import type { UsageRecord } from "./usage-records.repository.js";

///////////////////////////////////////////////////////
// Define usage and consumption types
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

export type ConsumeUsageTransactionInput = Pick<
  UsageRecord,
  "accountId" | "userId" | "requestId" | "requestedUnits"
>;

export type UsageRejectionReason =
  | "account_request_limit"
  | "account_monthly_limit"
  | "user_request_limit"
  | "user_monthly_limit";

export type ConsumeUsageResult = {
  record: UsageRecord;
  duplicate: boolean;
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

///////////////////////////////////////////////////////
// Consume usage and record the decision atomically
///////////////////////////////////////////////////////
export async function consumeUsageTransaction(
  input: ConsumeUsageTransactionInput,
): Promise<ConsumeUsageResult> {
  const { accountId, userId, requestId, requestedUnits } = input;

  return db.transaction(async (tx): Promise<ConsumeUsageResult> => {
    ///////////////////////////////////////////////////////
    // Lock the account to serialize its consumption requests
    ///////////////////////////////////////////////////////
    const lockedAccounts = await tx
      .select({
        id: accounts.id,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .for("update");

    if (!lockedAccounts[0]) {
      throw new Error("Account not found");
    }

    ///////////////////////////////////////////////////////
    // Return the original decision for a repeated request
    ///////////////////////////////////////////////////////
    const existingRecords = await tx
      .select()
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.accountId, accountId),
          eq(usageRecords.requestId, requestId),
        ),
      );

    const existingRecord = existingRecords[0];

    if (existingRecord) {
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

    ///////////////////////////////////////////////////////
    // Capture processing time after acquiring the account lock
    ///////////////////////////////////////////////////////
    const processedAt = new Date();
    const periodStart = `${processedAt.toISOString().slice(0, 7)}-01`;

    ///////////////////////////////////////////////////////
    // Read the account's current plan limits
    ///////////////////////////////////////////////////////
    const accountPlans = await tx
      .select({
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
      .where(eq(accounts.id, accountId));

    const accountPlan = accountPlans[0];

    if (!accountPlan) {
      throw new Error("Account plan not found");
    }

    ///////////////////////////////////////////////////////
    // Read the user's current plan within this account
    ///////////////////////////////////////////////////////
    const userPlans = await tx
      .select({
        monthlyAllowance: plans.monthlyAllowance,
        maxUnitsPerRequest: plans.maxUnitsPerRequest,
      })
      .from(users)
      .innerJoin(
        plans,
        and(eq(users.planId, plans.id), eq(users.planType, plans.planType)),
      )
      .where(and(eq(users.id, userId), eq(users.accountId, accountId)));

    const userPlan = userPlans[0];

    if (!userPlan) {
      throw new Error("User not found");
    }

    ///////////////////////////////////////////////////////
    // Read account and user usage for the processing month
    ///////////////////////////////////////////////////////
    const accountUsageRows = await tx
      .select()
      .from(usage)
      .where(
        and(
          eq(usage.accountId, accountId),
          isNull(usage.userId),
          eq(usage.periodStart, periodStart),
        ),
      );

    const userUsageRows = await tx
      .select()
      .from(usage)
      .where(
        and(
          eq(usage.accountId, accountId),
          eq(usage.userId, userId),
          eq(usage.periodStart, periodStart),
        ),
      );

    const accountUsage = accountUsageRows[0];
    const userUsage = userUsageRows[0];

    const accountUsedUnits = accountUsage?.usedUnits ?? 0;
    const userUsedUnits = userUsage?.usedUnits ?? 0;

    ///////////////////////////////////////////////////////
    // Check account limits before user limits
    ///////////////////////////////////////////////////////
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

    ///////////////////////////////////////////////////////
    // Record rejected requests without increasing usage
    ///////////////////////////////////////////////////////
    if (rejectionReason !== null) {
      const result = await tx
        .insert(usageRecords)
        .values({
          accountId,
          userId,
          requestId,
          requestedUnits,
          status: "rejected",
          rejectionReason,
          createdAt: processedAt,
        })
        .returning();

      const record = result[0];

      if (!record) {
        throw new Error("Failed to record rejected request");
      }

      return {
        record,
        duplicate: false,
      };
    }

    ///////////////////////////////////////////////////////
    // Increase account usage for an accepted request
    ///////////////////////////////////////////////////////
    if (accountUsage) {
      await tx
        .update(usage)
        .set({
          usedUnits: sql`${usage.usedUnits} + ${requestedUnits}`,
          updatedAt: processedAt,
        })
        .where(eq(usage.id, accountUsage.id));
    } else {
      await tx.insert(usage).values({
        accountId,
        userId: null,
        periodStart,
        usedUnits: requestedUnits,
        createdAt: processedAt,
        updatedAt: processedAt,
      });
    }

    ///////////////////////////////////////////////////////
    // Increase user usage for an accepted request
    ///////////////////////////////////////////////////////
    if (userUsage) {
      await tx
        .update(usage)
        .set({
          usedUnits: sql`${usage.usedUnits} + ${requestedUnits}`,
          updatedAt: processedAt,
        })
        .where(eq(usage.id, userUsage.id));
    } else {
      await tx.insert(usage).values({
        accountId,
        userId,
        periodStart,
        usedUnits: requestedUnits,
        createdAt: processedAt,
        updatedAt: processedAt,
      });
    }

    ///////////////////////////////////////////////////////
    // Record the accepted request within the same transaction
    ///////////////////////////////////////////////////////
    const result = await tx
      .insert(usageRecords)
      .values({
        accountId,
        userId,
        requestId,
        requestedUnits,
        status: "accepted",
        rejectionReason: null,
        createdAt: processedAt,
      })
      .returning();

    const record = result[0];

    if (!record) {
      throw new Error("Failed to record accepted request");
    }

    return {
      record,
      duplicate: false,
    };
  });
}
