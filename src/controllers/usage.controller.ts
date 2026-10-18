import type { Request, Response } from "express";

import {
  consumeUsage as consumeUsageService,
  getAccountUsage as getAccountUsageService,
  getUserUsage as getUserUsageService,
  getUsageRecordById as getUsageRecordByIdService,
  getUsageRecords as getUsageRecordsService,
} from "../services/usage.service.js";

import type {
  ConsumeUsageInput,
  UserIdParams,
  UsageRecordIdParams,
  UsageRecordsQuery,
} from "../validator/usage.validator.js";

// Get the account's current monthly usage.
export async function getAccountUsage(_req: Request, res: Response) {
  try {
    const accountId = res.locals.account.id;

    const result = await getAccountUsageService(accountId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get account usage:", error);

    return res.status(500).json({
      error: "Failed to get account usage",
    });
  }
}

// Get a user's current monthly usage.
export async function getUserUsage(_req: Request, res: Response) {
  try {
    const accountId = res.locals.account.id;
    const { userId } = res.locals.validatedParams as UserIdParams;

    const result = await getUserUsageService(accountId, userId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get user usage:", error);

    return res.status(500).json({
      error: "Failed to get user usage",
    });
  }
}

// Consume units for a user under the authenticated account.
export async function consumeUsage(_req: Request, res: Response) {
  try {
    const accountId = res.locals.account.id;
    const body = res.locals.validatedBody as ConsumeUsageInput;

    const result = await consumeUsageService({
      accountId,
      ...body,
    });

    return res.status(200).json({
      ...result.record,
      duplicate: result.duplicate,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Idempotency key reused with different request"
    ) {
      return res.status(409).json({
        error: error.message,
      });
    }

    if (
      error instanceof Error &&
      [
        "Account not found",
        "User not found",
        "Account plan not found",
      ].includes(error.message)
    ) {
      return res.status(404).json({
        error: error.message,
      });
    }

    console.error("Failed to consume usage:", error);

    return res.status(500).json({
      error: "Failed to consume usage",
    });
  }
}

// Get usage records with pagination.
export async function getUsageRecords(_req: Request, res: Response) {
  try {
    const accountId = res.locals.account.id;
    const { page, limit } = res.locals.validatedQuery as UsageRecordsQuery;

    const result = await getUsageRecordsService(accountId, page, limit);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get usage records:", error);

    return res.status(500).json({
      error: "Failed to get usage records",
    });
  }
}

// Get one usage record by ID.
export async function getUsageRecordById(_req: Request, res: Response) {
  try {
    const accountId = res.locals.account.id;
    const { id } = res.locals.validatedParams as UsageRecordIdParams;

    const result = await getUsageRecordByIdService(accountId, id);

    if (!result) {
      return res.status(404).json({
        error: "Usage record not found",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get usage record:", error);

    return res.status(500).json({
      error: "Failed to get usage record",
    });
  }
}
