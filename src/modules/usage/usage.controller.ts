import type { Request, Response } from "express";

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
  UsageRecordsQuery,
} from "./usage.validator.js";

///////////////////////////////////////////////////////
// Define validated controller locals
///////////////////////////////////////////////////////
type ConsumeUsageLocals = {
  validatedBody: ConsumeUsageInput;
};

type GetUserUsageLocals = {
  validatedParams: UserIdParams;
};

type GetUsageRecordsLocals = {
  validatedQuery: UsageRecordsQuery;
};

type GetUsageRecordLocals = {
  validatedParams: UsageRecordIdParams;
};

///////////////////////////////////////////////////////
// GET /api/usage/account
///////////////////////////////////////////////////////
export async function getAccountUsage(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const result = await getAccountUsageService(account.id);

    res.status(200).json(result);
  } catch (error) {
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
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const { userId } = res.locals.validatedParams;

    const result = await getUserUsageService(account.id, userId);

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
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const body = res.locals.validatedBody;

    const result = await consumeUsageService({
      ...body,
      accountId: account.id,
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
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const { page, limit } = res.locals.validatedQuery;

    const result = await getUsageRecordsService(account.id, page, limit);

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
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const { id } = res.locals.validatedParams;

    const result = await getUsageRecordByIdService(account.id, id);

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
