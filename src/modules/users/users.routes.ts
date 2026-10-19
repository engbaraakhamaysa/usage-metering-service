import { Router } from "express";

import {
  createUserController,
  getUsersController,
  getUserController,
  updateUserPlanController,
} from "./users.controller.js";

import { authenticateApiKey } from "../../middlewares/authenticate-api-key.js";
import { validate } from "../../middlewares/validate.js";

import {
  createUserSchema,
  updateUserPlanSchema,
  userIdParamsSchema,
} from "./users.validator.js";

const usersRouter = Router();

///////////////////////////////////////////////////////
// Create a user belonging to the authenticated account
///////////////////////////////////////////////////////
usersRouter.post(
  "/",
  authenticateApiKey,
  validate(createUserSchema),
  createUserController,
);

///////////////////////////////////////////////////////
// Get all users belonging to the authenticated account
///////////////////////////////////////////////////////
usersRouter.get("/", authenticateApiKey, getUsersController);

///////////////////////////////////////////////////////
// Get one user belonging to the authenticated account
///////////////////////////////////////////////////////
usersRouter.get(
  "/:id",
  authenticateApiKey,
  validate(userIdParamsSchema, "params"),
  getUserController,
);

///////////////////////////////////////////////////////
// Change a user's plan within the authenticated account
///////////////////////////////////////////////////////
usersRouter.patch(
  "/:id/plan",
  authenticateApiKey,
  validate(userIdParamsSchema, "params"),
  validate(updateUserPlanSchema),
  updateUserPlanController,
);

export default usersRouter;
