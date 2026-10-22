import type { Request, Response } from "express";

import type { AuthenticatedLocals } from "../../middlewares/authenticate-api-key.js";

import {
  createUser,
  getUsers,
  getUser,
  updateUserPlan,
} from "./users.service.js";

import type {
  CreateUserInput,
  UpdateUserPlanInput,
  UserIdParams,
} from "./users.validator.js";

///////////////////////////////////////////////////////
// Define authenticated and validated controller locals
///////////////////////////////////////////////////////
type CreateUserLocals = AuthenticatedLocals & {
  validatedBody: CreateUserInput;
};

type GetUserLocals = AuthenticatedLocals & {
  validatedParams: UserIdParams;
};

type UpdateUserPlanLocals = AuthenticatedLocals & {
  validatedParams: UserIdParams;
  validatedBody: UpdateUserPlanInput;
};

///////////////////////////////////////////////////////
// POST /api/users
///////////////////////////////////////////////////////
export async function createUserController(
  _req: Request,
  res: Response<unknown, CreateUserLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const data = res.locals.validatedBody;

    const user = await createUser(accountId, data);

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid user plan") {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (error.message === "User name already exists in this account") {
        res.status(409).json({
          error: error.message,
        });
        return;
      }
    }

    console.error("Failed to create user:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

///////////////////////////////////////////////////////
// GET /api/users
///////////////////////////////////////////////////////
export async function getUsersController(
  _req: Request,
  res: Response<unknown, AuthenticatedLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;

    const users = await getUsers(accountId);

    res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

///////////////////////////////////////////////////////
// GET /api/users/:id
///////////////////////////////////////////////////////
export async function getUserController(
  _req: Request,
  res: Response<unknown, GetUserLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const { id } = res.locals.validatedParams;

    const user = await getUser(id, accountId);

    if (!user) {
      res.status(404).json({
        error: "User not found",
      });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

///////////////////////////////////////////////////////
// PATCH /api/users/:id/plan
///////////////////////////////////////////////////////
export async function updateUserPlanController(
  _req: Request,
  res: Response<unknown, UpdateUserPlanLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const { id } = res.locals.validatedParams;
    const { planId } = res.locals.validatedBody;

    const user = await updateUserPlan(id, accountId, planId);

    res.status(200).json(user);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({
          error: error.message,
        });
        return;
      }

      if (error.message === "Invalid user plan") {
        res.status(400).json({
          error: error.message,
        });
        return;
      }
    }

    console.error("Failed to update user plan:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
