import type { Request, Response } from "express";

import type { AuthenticatedLocals } from "../../middlewares/authenticate-api-key.js";

import {
  getUsageRecords as getUsageRecordsService,
  getUsageRecordById as getUsageRecordByIdService,
} from "./usage-records.service.js";

import type {
  UsageRecordIdParams,
  UsageRecordsQuery,
} from "./usage-records.validator.js";

///////////////////////////////////////////////////////
// Define authenticated and validated controller locals
///////////////////////////////////////////////////////
type GetUsageRecordsLocals = AuthenticatedLocals & {
  validatedQuery: UsageRecordsQuery;
};

type GetUsageRecordLocals = AuthenticatedLocals & {
  validatedParams: UsageRecordIdParams;
};

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
