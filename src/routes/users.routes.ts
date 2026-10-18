import { Router } from "express";

import {
  createUserController,
  getUsersController,
  getUserController,
  updateUserPlanController,
  updateUserController,
} from "../controllers/users.controller.js";

import { authenticateApiKey } from "../middlewares/authenticate-api-key.js";
import { validate } from "../middlewares/validate.js";

import {
  createUserSchema,
  updateUserPlanSchema,
  userIdParamsSchema,
  updateUserSchema,
} from "../validator/users.validator.js";

const usersRouter = Router();

// 1. Create a user belonging to the authenticated account.
usersRouter.post(
  "/",
  authenticateApiKey,
  validate(createUserSchema),
  createUserController,
);

// 2. Get all users belonging to the authenticated account.
usersRouter.get("/", authenticateApiKey, getUsersController);

// 3. Get one user belonging to the authenticated account.
usersRouter.get(
  "/:id",
  authenticateApiKey,
  validate(userIdParamsSchema, "params"),
  getUserController,
);

// 4. Update a users plan.
usersRouter.patch(
  "/:id/plan",
  authenticateApiKey,
  validate(userIdParamsSchema, "params"),
  validate(updateUserPlanSchema),
  updateUserPlanController,
);

// 5. Update a users information.
usersRouter.patch(
  "/:id",
  authenticateApiKey,
  validate(userIdParamsSchema, "params"),
  validate(updateUserSchema),
  updateUserController,
);

export default usersRouter;
