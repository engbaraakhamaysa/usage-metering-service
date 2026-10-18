import { Router } from "express";
import { createAccountController } from "../controllers/accounts.controller.js";
import { validate } from "../middlewares/validate.js";
import { createAccountSchema } from "../validator/accounts.validator.js";

import { updateAccountPlanController } from "../controllers/accounts.controller.js";
import { updateAccountPlanSchema } from "../validator/accounts.validator.js";

import { authenticateApiKey } from "../middlewares/authenticate-api-key.js";

const accountsRouter = Router();

accountsRouter.post(
  "/",
  validate(createAccountSchema),
  createAccountController,
);

accountsRouter.patch(
  "/me/plan",
  authenticateApiKey,
  validate(updateAccountPlanSchema),
  updateAccountPlanController,
);

export default accountsRouter;
