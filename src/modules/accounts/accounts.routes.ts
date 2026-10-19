import { Router } from "express";

import {
  createAccountController,
  updateAccountPlanController,
} from "./accounts.controller.js";

import { authenticateApiKey } from "../../middlewares/authenticate-api-key.js";
import { validate } from "../../middlewares/validate.js";

import {
  createAccountSchema,
  updateAccountPlanSchema,
} from "./accounts.validator.js";

const accountsRouter = Router();

///////////////////////////////////////////////////////
// Create a new account
///////////////////////////////////////////////////////
accountsRouter.post(
  "/",
  validate(createAccountSchema),
  createAccountController,
);

///////////////////////////////////////////////////////
// Change the authenticated account's plan
///////////////////////////////////////////////////////
accountsRouter.patch(
  "/me/plan",
  authenticateApiKey,
  validate(updateAccountPlanSchema),
  updateAccountPlanController,
);

export default accountsRouter;
