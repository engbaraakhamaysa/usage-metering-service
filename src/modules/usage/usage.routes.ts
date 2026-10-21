import { Router } from "express";

import {
  consumeUsage,
  getAccountUsage,
  getUserUsage,
  getUsageRecords,
  getUsageRecordById,
} from "./usage.controller.js";

import { authenticateApiKey } from "../../middlewares/authenticate-api-key.js";
import { validate } from "../../middlewares/validate.js";

import {
  consumeUsageSchema,
  userIdParamsSchema,
  usageRecordIdParamsSchema,
  usageQuerySchema,
  usageRecordsQuerySchema,
} from "./usage.validator.js";

const usageRouter = Router();

///////////////////////////////////////////////////////
// Authenticate all usage routes
///////////////////////////////////////////////////////
usageRouter.use(authenticateApiKey);

///////////////////////////////////////////////////////
// Consume units for a user
///////////////////////////////////////////////////////
usageRouter.post("/consume", validate(consumeUsageSchema), consumeUsage);

///////////////////////////////////////////////////////
// Get account usage for the selected or current month
///////////////////////////////////////////////////////
usageRouter.get(
  "/account",
  validate(usageQuerySchema, "query"),
  getAccountUsage,
);

///////////////////////////////////////////////////////
// Get user usage for the selected or current month
///////////////////////////////////////////////////////
usageRouter.get(
  "/users/:userId",
  validate(userIdParamsSchema, "params"),
  validate(usageQuerySchema, "query"),
  getUserUsage,
);

///////////////////////////////////////////////////////
// Get usage records with pagination
///////////////////////////////////////////////////////
usageRouter.get(
  "/records",
  validate(usageRecordsQuerySchema, "query"),
  getUsageRecords,
);

///////////////////////////////////////////////////////
// Get one usage record by ID
///////////////////////////////////////////////////////
usageRouter.get(
  "/records/:id",
  validate(usageRecordIdParamsSchema, "params"),
  getUsageRecordById,
);

export default usageRouter;
