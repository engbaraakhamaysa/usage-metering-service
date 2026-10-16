import {
  createUsageRecord,
  findUsageRecordByRequestId,
} from "../repositories/usage-records.repository.js";

import {
  findAccountWithPlan,
  findUserWithPlan,
} from "../repositories/usage.repository.js";

import { consumeUsage } from "./usage.service.js";

// Consume usage with idempotency support
export async function consumeUsageWithRecord(
  accountId: string,
  userId: string,
  requestId: string,
  units: number,
) {
  // Check whether this request has already been processed
  const existingRecord = await findUsageRecordByRequestId(accountId, requestId);

  if (existingRecord) {
    // Ensure the request data matches the original request
    if (
      existingRecord.userId !== userId ||
      existingRecord.requestedUnits !== units
    ) {
      return {
        success: false as const,
        status: 409,
        message: "Request ID already used with different data",
      };
    }

    // Return the existing result without consuming units again
    if (existingRecord.status === "accepted") {
      return {
        success: true as const,
        status: 200,
        message: "Request already processed",
        data: {
          accountId: existingRecord.accountId,
          userId: existingRecord.userId,
          requestId: existingRecord.requestId,
          units: existingRecord.requestedUnits,
          status: existingRecord.status,
          rejectionReason: existingRecord.rejectionReason,
          replayed: true,
        },
      };
    }

    // Return the previous rejection
    const rejectionReason =
      existingRecord.rejectionReason ?? "Usage request was rejected";

    return {
      success: false as const,
      status:
        rejectionReason === "Request exceeds the per-request limit" ? 400 : 403,
      message: rejectionReason,
      data: {
        accountId: existingRecord.accountId,
        userId: existingRecord.userId,
        requestId: existingRecord.requestId,
        units: existingRecord.requestedUnits,
        status: existingRecord.status,
        rejectionReason,
        replayed: true,
      },
    };
  }

  // Check whether the account and user exist
  const account = await findAccountWithPlan(accountId);
  const user = await findUserWithPlan(userId);

  // Let the existing service return the appropriate validation error
  // without creating a record that violates the foreign keys
  if (!account || !user || user.accountId !== accountId) {
    return consumeUsage(accountId, userId, units);
  }

  // Process the usage request
  const result = await consumeUsage(accountId, userId, units);

  // Save the result of the request
  await createUsageRecord({
    accountId,
    userId,
    requestId,
    requestedUnits: units,
    status: result.success ? "accepted" : "rejected",
    rejectionReason: result.success ? null : result.message,
  });

  return result;
}
