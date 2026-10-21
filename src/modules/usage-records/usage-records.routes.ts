import { Router } from "express";

import {
  getUsageRecords,
  getUsageRecordById,
} from "./usage-records.controller.js";

import { authenticateApiKey } from "../../middlewares/authenticate-api-key.js";
import { validate } from "../../middlewares/validate.js";

import {
  usageRecordIdParamsSchema,
  usageRecordsQuerySchema,
} from "./usage-records.validator.js";

const usageRecordsRouter = Router();

///////////////////////////////////////////////////////
// Authenticate all usage record routes
///////////////////////////////////////////////////////
usageRecordsRouter.use(authenticateApiKey);

///////////////////////////////////////////////////////
// Get usage records with pagination
///////////////////////////////////////////////////////
usageRecordsRouter.get(
  "/",
  validate(usageRecordsQuerySchema, "query"),
  getUsageRecords,
);

///////////////////////////////////////////////////////
// Get one usage record by ID
///////////////////////////////////////////////////////
usageRecordsRouter.get(
  "/:id",
  validate(usageRecordIdParamsSchema, "params"),
  getUsageRecordById,
);

export default usageRecordsRouter;
