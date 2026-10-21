import {
  countUsageRecords,
  findUsageRecordById,
  findUsageRecords,
  type UsageRecord,
} from "./usage-records.repository.js";

///////////////////////////////////////////////////////
// Define usage records result type
///////////////////////////////////////////////////////
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
