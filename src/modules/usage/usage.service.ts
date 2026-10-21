import {
  consumeUsageTransaction,
  findAccountUsage,
  findUserUsage,
  type ConsumeUsageResult,
  type AccountUsageDetails,
  type UserUsageDetails,
} from "./usage.repository.js";

import {
  countUsageRecords,
  findUsageRecordById,
  findUsageRecords,
  type UsageRecord,
} from "./usage-records.repository.js";

import type { ConsumeUsageInput, UsageQuery } from "./usage.validator.js";

///////////////////////////////////////////////////////
// Define service input and result types
///////////////////////////////////////////////////////
type ConsumeUsageServiceInput = ConsumeUsageInput & {
  accountId: string;
};

type AccountUsageResult = AccountUsageDetails & {
  periodStart: string;
  remainingUnits: number | null;
};

type UserUsageResult = UserUsageDetails & {
  periodStart: string;
  remainingUnits: number | null;
};

type UsageRecordsResult = {
  records: UsageRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

///////////////////////////////////////////////////////
// Get the first day of the current month in UTC
///////////////////////////////////////////////////////
function getCurrentPeriodStart(): string {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

///////////////////////////////////////////////////////
// Get account usage for the selected or current month
///////////////////////////////////////////////////////
export async function getAccountUsage(
  accountId: string,
  month?: UsageQuery["month"],
): Promise<AccountUsageResult> {
  const currentPeriodStart = getCurrentPeriodStart();
  const periodStart = month ? `${month}-01` : currentPeriodStart;

  const accountUsage = await findAccountUsage(accountId, periodStart);

  if (!accountUsage) {
    throw new Error("Account not found");
  }

  const remainingUnits =
    periodStart === currentPeriodStart
      ? Math.max(
          0,
          accountUsage.currentPlan.monthlyAllowance - accountUsage.usedUnits,
        )
      : null;

  return {
    ...accountUsage,
    periodStart,
    remainingUnits,
  };
}

///////////////////////////////////////////////////////
// Get user usage for the selected month within an account
///////////////////////////////////////////////////////
export async function getUserUsage(
  accountId: string,
  userId: string,
  month?: UsageQuery["month"],
): Promise<UserUsageResult> {
  const currentPeriodStart = getCurrentPeriodStart();
  const periodStart = month ? `${month}-01` : currentPeriodStart;

  const userUsage = await findUserUsage(accountId, userId, periodStart);

  if (!userUsage) {
    throw new Error("User not found");
  }

  const remainingUnits =
    periodStart === currentPeriodStart
      ? Math.max(
          0,
          userUsage.currentPlan.monthlyAllowance - userUsage.usedUnits,
        )
      : null;

  return {
    ...userUsage,
    periodStart,
    remainingUnits,
  };
}

///////////////////////////////////////////////////////
// Consume units for a user under a specific account
///////////////////////////////////////////////////////
export async function consumeUsage(
  input: ConsumeUsageServiceInput,
): Promise<ConsumeUsageResult> {
  const periodStart = getCurrentPeriodStart();

  return consumeUsageTransaction({
    ...input,
    periodStart,
  });
}

///////////////////////////////////////////////////////
// Get usage records with pagination
///////////////////////////////////////////////////////
export async function getUsageRecords(
  accountId: string,
  page: number,
  limit: number,
): Promise<UsageRecordsResult> {
  const offset = (page - 1) * limit;

  const [records, total] = await Promise.all([
    findUsageRecords(accountId, limit, offset),
    countUsageRecords(accountId),
  ]);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

///////////////////////////////////////////////////////
// Get one usage record belonging to a specific account
///////////////////////////////////////////////////////
export async function getUsageRecordById(
  accountId: string,
  recordId: string,
): Promise<UsageRecord | null> {
  return findUsageRecordById(accountId, recordId);
}
