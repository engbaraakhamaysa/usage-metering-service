import type { Request, Response } from "express";

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
// Define validated controller locals
///////////////////////////////////////////////////////
type CreateUserLocals = {
  validatedBody: CreateUserInput;
};

type GetUserLocals = {
  validatedParams: UserIdParams;
};

type UpdateUserPlanLocals = {
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
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const data = res.locals.validatedBody;
    const user = await createUser(account.id, data);

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid user plan") {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    console.error("Failed to create user:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

///////////////////////////////////////////////////////
// GET /api/users
///////////////////////////////////////////////////////
export async function getUsersController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const users = await getUsers(account.id);

    res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);

    res.status(500).json({
      message: "Internal server error",
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
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const { id } = res.locals.validatedParams;
    const user = await getUser(id, account.id);

    if (!user) {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);

    res.status(500).json({
      message: "Internal server error",
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
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const { id } = res.locals.validatedParams;
    const { planId } = res.locals.validatedBody;

    const user = await updateUserPlan(id, account.id, planId);

    res.status(200).json(user);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({
          message: error.message,
        });
        return;
      }

      if (error.message === "Invalid user plan") {
        res.status(400).json({
          message: error.message,
        });
        return;
      }
    }

    console.error("Failed to update user plan:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}
