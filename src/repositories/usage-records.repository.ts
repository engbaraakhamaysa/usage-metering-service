import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { usageRecords } from "../db/schema/usage-records.js";

// Find an existing usage record by account ID and request ID
export async function findUsageRecordByRequestId(
  accountId: string,
  requestId: string,
) {
  const result = await db
    .select()
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.accountId, accountId),
        eq(usageRecords.requestId, requestId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

// Create a usage record
export async function createUsageRecord(data: {
  accountId: string;
  userId: string;
  requestId: string;
  requestedUnits: number;
  status: "accepted" | "rejected";
  rejectionReason?: string | null;
}) {
  const result = await db
    .insert(usageRecords)
    .values({
      accountId: data.accountId,
      userId: data.userId,
      requestId: data.requestId,
      requestedUnits: data.requestedUnits,
      status: data.status,
      rejectionReason: data.rejectionReason ?? null,
    })
    .returning();

  return result[0];
}
