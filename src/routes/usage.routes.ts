import { Router } from "express";

import {
  consumeUsage,
  getAccountUsage,
  getUserUsage,
  getUsageRecords,
  getUsageRecordById,
} from "../controllers/usage.controller.js";

import { authenticateApiKey } from "../middlewares/authenticate-api-key.js";
import { validate } from "../middlewares/validate.js";

import {
  consumeUsageSchema,
  userIdParamsSchema,
  usageRecordIdParamsSchema,
  usageRecordsQuerySchema,
} from "../validator/usage.validator.js";

const router = Router();

// Authenticate all usage routes.
router.use(authenticateApiKey);

// POST /api/usage/consume
router.post("/consume", validate(consumeUsageSchema, "body"), consumeUsage);

// GET /api/usage/account
router.get("/account", getAccountUsage);

// GET /api/usage/users/:userId
router.get(
  "/users/:userId",
  validate(userIdParamsSchema, "params"),
  getUserUsage,
);

// GET /api/usage/records
router.get(
  "/records",
  validate(usageRecordsQuerySchema, "query"),
  getUsageRecords,
);

// GET /api/usage/records/:id
router.get(
  "/records/:id",
  validate(usageRecordIdParamsSchema, "params"),
  getUsageRecordById,
);

export default router;
