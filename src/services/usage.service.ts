import {
  countUsageRecords,
  consumeUsageTransaction,
  findAccountUsage,
  findUsageRecordById,
  findUsageRecords,
  findUserUsage,
} from "../repositories/usage.repository.js";

import type { ConsumeUsageInput } from "../validator/usage.validator.js";

// ============================================================
// Types
// ============================================================

type ConsumeUsageServiceInput = ConsumeUsageInput & {
  accountId: string;
};

// ============================================================
// Helpers
// ============================================================

// Get the first day of the current month in UTC.
function getCurrentPeriodStart(): string {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

// ============================================================
// Account Usage
// ============================================================

// Get the account's usage for the current month.
export async function getAccountUsage(accountId: string) {
  const periodStart = getCurrentPeriodStart();

  const accountUsage = await findAccountUsage(accountId, periodStart);

  return {
    accountId,
    periodStart,
    usedUnits: accountUsage?.usedUnits ?? 0,
  };
}

// ============================================================
// User Usage
// ============================================================

// Get a user's usage for the current month.
export async function getUserUsage(accountId: string, userId: string) {
  const periodStart = getCurrentPeriodStart();

  const userUsage = await findUserUsage(accountId, userId, periodStart);

  return {
    accountId,
    userId,
    periodStart,
    usedUnits: userUsage?.usedUnits ?? 0,
  };
}

// ============================================================
// Consume Usage
// ============================================================

// Consume units for a user under an account.
export async function consumeUsage(input: ConsumeUsageServiceInput) {
  const periodStart = getCurrentPeriodStart();

  return consumeUsageTransaction({
    ...input,
    periodStart,
  });
}

// ============================================================
// Usage Records
// ============================================================

// Get usage records with pagination.
export async function getUsageRecords(
  accountId: string,
  page: number,
  limit: number,
) {
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

// ============================================================
// Single Usage Record
// ============================================================

// Get one usage record by ID.
export async function getUsageRecordById(accountId: string, recordId: string) {
  return findUsageRecordById(accountId, recordId);
}
