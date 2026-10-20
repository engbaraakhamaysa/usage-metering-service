import { Router } from "express";

import {
  getPlansController,
  getAccountPlansController,
  createPrivatePlanController,
  updatePlanController,
} from "./plans.controller.js";

import { authenticateApiKey } from "../../middlewares/authenticate-api-key.js";
import { validate } from "../../middlewares/validate.js";

import {
  createPlanSchema,
  getPlansQuerySchema,
  planIdParamsSchema,
  updatePlanSchema,
} from "./plans.validator.js";

const plansRouter = Router();

///////////////////////////////////////////////////////
// Get public plans with optional type filtering
///////////////////////////////////////////////////////
plansRouter.get(
  "/",
  validate(getPlansQuerySchema, "query"),
  getPlansController,
);

///////////////////////////////////////////////////////
// Get plans available to the authenticated account
///////////////////////////////////////////////////////
plansRouter.get(
  "/me",
  authenticateApiKey,
  validate(getPlansQuerySchema, "query"),
  getAccountPlansController,
);

///////////////////////////////////////////////////////
// Create a private plan for the authenticated account
///////////////////////////////////////////////////////
plansRouter.post(
  "/",
  authenticateApiKey,
  validate(createPlanSchema),
  createPrivatePlanController,
);

///////////////////////////////////////////////////////
// Update a private plan for the authenticated account
///////////////////////////////////////////////////////
plansRouter.patch(
  "/:id",
  authenticateApiKey,
  validate(planIdParamsSchema, "params"),
  validate(updatePlanSchema),
  updatePlanController,
);

export default plansRouter;
