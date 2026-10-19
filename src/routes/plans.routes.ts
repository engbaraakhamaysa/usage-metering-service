import { Router } from "express";

import {
  getPlansController,
  createPrivatePlanController,
  updatePlanController,
} from "../controllers/plans.controller.js";

import { authenticateApiKey } from "../middlewares/authenticate-api-key.js";
import { validate } from "../middlewares/validate.js";

import {
  createPlanSchema,
  getPlansQuerySchema,
  planIdParamsSchema,
  updatePlanSchema,
} from "../validator/plans.validator.js";

const plansRouter = Router();

plansRouter.get(
  "/",
  validate(getPlansQuerySchema, "query"),
  getPlansController,
);

// Create a private plan owned by the authenticated account.
plansRouter.post(
  "/",
  authenticateApiKey,
  validate(createPlanSchema),
  createPrivatePlanController,
);

//  Update a private plan owned by the authenticated account.
plansRouter.patch(
  "/:id",
  authenticateApiKey,
  validate(planIdParamsSchema, "params"),
  validate(updatePlanSchema),
  updatePlanController,
);

export default plansRouter;
