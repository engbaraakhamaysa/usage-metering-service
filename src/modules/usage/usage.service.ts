import {
  consumeUsageTransaction,
  findAccountUsage,
  findUserUsage,
  type ConsumeUsageResult,
} from "./usage.repository.js";

import {
  countUsageRecords,
  findUsageRecordById,
  findUsageRecords,
  type UsageRecord,
} from "./usage-records.repository.js";

import { getUser } from "../users/users.service.js";

import type { ConsumeUsageInput } from "./usage.validator.js";

///////////////////////////////////////////////////////
// Define service input and result types
///////////////////////////////////////////////////////
type ConsumeUsageServiceInput = ConsumeUsageInput & {
  accountId: string;
};

type AccountUsageResult = {
  accountId: string;
  periodStart: string;
  usedUnits: number;
};

type UserUsageResult = AccountUsageResult & {
  userId: string;
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
// Get the account's current monthly usage
///////////////////////////////////////////////////////
export async function getAccountUsage(
  accountId: string,
): Promise<AccountUsageResult> {
  const periodStart = getCurrentPeriodStart();

  const accountUsage = await findAccountUsage(accountId, periodStart);

  return {
    accountId,
    periodStart,
    usedUnits: accountUsage?.usedUnits ?? 0,
  };
}

///////////////////////////////////////////////////////
// Get a user's current monthly usage within an account
///////////////////////////////////////////////////////
export async function getUserUsage(
  accountId: string,
  userId: string,
): Promise<UserUsageResult> {
  const user = await getUser(userId, accountId);

  if (!user) {
    throw new Error("User not found");
  }

  const periodStart = getCurrentPeriodStart();

  const userUsage = await findUserUsage(accountId, userId, periodStart);

  return {
    accountId,
    userId,
    periodStart,
    usedUnits: userUsage?.usedUnits ?? 0,
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
