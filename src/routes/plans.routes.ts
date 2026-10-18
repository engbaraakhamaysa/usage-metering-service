import { Router } from "express";

import {
  getPublicUserPlansController,
  getPublicAccountPlansController,
  getPlansController,
  getPlanByIdController,
  createPrivatePlanController,
  createPublicPlanController,
  updatePlanController,
} from "../controllers/plans.controller.js";

import { authenticateApiKey } from "../middlewares/authenticate-api-key.js";
import { validate } from "../middlewares/validate.js";

import {
  createPlanSchema,
  planIdParamsSchema,
  updatePlanSchema,
} from "../validator/plans.validator.js";

const plansRouter = Router();

// 1. Get public user plans.
plansRouter.get("/public/users", getPublicUserPlansController);

// 2. Get public account plans.
plansRouter.get("/public/accounts", getPublicAccountPlansController);

// 3. Get public and private plans available to the authenticated account.
plansRouter.get("/", authenticateApiKey, getPlansController);

// 4. Get one public plan or a private plan owned by the authenticated account.
plansRouter.get(
  "/:id",
  authenticateApiKey,
  validate(planIdParamsSchema, "params"),
  getPlanByIdController,
);

// 5. Create a private plan owned by the authenticated account.
plansRouter.post(
  "/",
  authenticateApiKey,
  validate(createPlanSchema),
  createPrivatePlanController,
);

// 6. Update a private plan owned by the authenticated account.
plansRouter.patch(
  "/:id",
  authenticateApiKey,
  validate(planIdParamsSchema, "params"),
  validate(updatePlanSchema),
  updatePlanController,
);

// 7. Create a public plan.
// This route must be protected by an appropriate admin authorization mechanism.
plansRouter.post(
  "/public",
  validate(createPlanSchema),
  createPublicPlanController,
);

export default plansRouter;
