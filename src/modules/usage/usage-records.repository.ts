import { and, eq, desc, count } from "drizzle-orm";

import { db } from "../../db/client.js";
import { usageRecords } from "../../db/schema/usage-records.js";

export type UsageRecord = typeof usageRecords.$inferSelect;

///////////////////////////////////////////////////////
// Find usage records belonging to a specific account
///////////////////////////////////////////////////////
export async function findUsageRecords(
  accountId: string,
  limit: number,
  offset: number,
): Promise<UsageRecord[]> {
  return db
    .select()
    .from(usageRecords)
    .where(eq(usageRecords.accountId, accountId))
    .orderBy(desc(usageRecords.createdAt), desc(usageRecords.id))
    .limit(limit)
    .offset(offset);
}

///////////////////////////////////////////////////////
// Count usage records belonging to a specific account
///////////////////////////////////////////////////////
export async function countUsageRecords(accountId: string): Promise<number> {
  const result = await db
    .select({
      total: count(),
    })
    .from(usageRecords)
    .where(eq(usageRecords.accountId, accountId));

  return result[0]?.total ?? 0;
}

///////////////////////////////////////////////////////
// Find a usage record belonging to a specific account
///////////////////////////////////////////////////////
export async function findUsageRecordById(
  accountId: string,
  recordId: string,
): Promise<UsageRecord | null> {
  const result = await db
    .select()
    .from(usageRecords)
    .where(
      and(eq(usageRecords.accountId, accountId), eq(usageRecords.id, recordId)),
    );

  return result[0] ?? null;
}
