import { Router } from "express";

import {
  getPublicUserPlansController,
  getPublicAccountPlansController,
  getPlansByOwnerController,
  createPrivatePlanController,
  createPublicPlanController,
} from "../controllers/plans.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  createPlanSchema,
  accountIdParamsSchema,
} from "../validator/plans.validator.js";

const plansRouter = Router();

// 1. Get public user plans.
plansRouter.get("/public/users", getPublicUserPlansController);

// 2. Get public account plans.
plansRouter.get("/public/accounts", getPublicAccountPlansController);

// 3. Get plans owned by a specific account.
plansRouter.get(
  "/owner/:accountId",
  validate(accountIdParamsSchema, "params"),
  getPlansByOwnerController,
);

// 4. Create a private plan.
plansRouter.post(
  "/private/:accountId",
  validate(accountIdParamsSchema, "params"),
  validate(createPlanSchema),
  createPrivatePlanController,
);

// 5. Create a public plan.
plansRouter.post(
  "/public",
  validate(createPlanSchema),
  createPublicPlanController,
);

export default plansRouter;
