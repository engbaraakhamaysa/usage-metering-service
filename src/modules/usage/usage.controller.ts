import type { Request, Response } from "express";

import type { AuthenticatedLocals } from "../../middlewares/authenticate-api-key.js";

import {
  consumeUsage as consumeUsageService,
  getAccountUsage as getAccountUsageService,
  getUserUsage as getUserUsageService,
  getUsageRecordById as getUsageRecordByIdService,
  getUsageRecords as getUsageRecordsService,
} from "./usage.service.js";

import type {
  ConsumeUsageInput,
  UserIdParams,
  UsageRecordIdParams,
  UsageQuery,
  UsageRecordsQuery,
} from "./usage.validator.js";

///////////////////////////////////////////////////////
// Define authenticated and validated controller locals
///////////////////////////////////////////////////////
type ConsumeUsageLocals = AuthenticatedLocals & {
  validatedBody: ConsumeUsageInput;
};

type GetAccountUsageLocals = AuthenticatedLocals & {
  validatedQuery: UsageQuery;
};

type GetUserUsageLocals = AuthenticatedLocals & {
  validatedParams: UserIdParams;
  validatedQuery: UsageQuery;
};

type GetUsageRecordsLocals = AuthenticatedLocals & {
  validatedQuery: UsageRecordsQuery;
};

type GetUsageRecordLocals = AuthenticatedLocals & {
  validatedParams: UsageRecordIdParams;
};

///////////////////////////////////////////////////////
// GET /api/usage/account
///////////////////////////////////////////////////////
export async function getAccountUsage(
  _req: Request,
  res: Response<unknown, GetAccountUsageLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const { month } = res.locals.validatedQuery;

    const result = await getAccountUsageService(accountId, month);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Account not found") {
      res.status(404).json({
        error: error.message,
      });
      return;
    }

    console.error("Failed to get account usage:", error);

    res.status(500).json({
      error: "Failed to get account usage",
    });
  }
}

///////////////////////////////////////////////////////
// GET /api/usage/users/:userId
///////////////////////////////////////////////////////
export async function getUserUsage(
  _req: Request,
  res: Response<unknown, GetUserUsageLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const { userId } = res.locals.validatedParams;
    const { month } = res.locals.validatedQuery;

    const result = await getUserUsageService(accountId, userId, month);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({
        error: error.message,
      });
      return;
    }

    console.error("Failed to get user usage:", error);

    res.status(500).json({
      error: "Failed to get user usage",
    });
  }
}

///////////////////////////////////////////////////////
// POST /api/usage/consume
///////////////////////////////////////////////////////
export async function consumeUsage(
  _req: Request,
  res: Response<unknown, ConsumeUsageLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const body = res.locals.validatedBody;

    const result = await consumeUsageService({
      ...body,
      accountId,
    });

    res.status(200).json({
      ...result.record,
      duplicate: result.duplicate,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Idempotency key reused with different request") {
        res.status(409).json({
          error: error.message,
        });
        return;
      }

      if (
        [
          "Account not found",
          "User not found",
          "Account plan not found",
        ].includes(error.message)
      ) {
        res.status(404).json({
          error: error.message,
        });
        return;
      }
    }

    console.error("Failed to consume usage:", error);

    res.status(500).json({
      error: "Failed to consume usage",
    });
  }
}

///////////////////////////////////////////////////////
// GET /api/usage/records
///////////////////////////////////////////////////////
export async function getUsageRecords(
  _req: Request,
  res: Response<unknown, GetUsageRecordsLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const { page, limit } = res.locals.validatedQuery;

    const result = await getUsageRecordsService(accountId, page, limit);

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get usage records:", error);

    res.status(500).json({
      error: "Failed to get usage records",
    });
  }
}

///////////////////////////////////////////////////////
// GET /api/usage/records/:id
///////////////////////////////////////////////////////
export async function getUsageRecordById(
  _req: Request,
  res: Response<unknown, GetUsageRecordLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const { id } = res.locals.validatedParams;

    const result = await getUsageRecordByIdService(accountId, id);

    if (!result) {
      res.status(404).json({
        error: "Usage record not found",
      });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to get usage record:", error);

    res.status(500).json({
      error: "Failed to get usage record",
    });
  }
}
