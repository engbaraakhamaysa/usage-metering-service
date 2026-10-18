import type { Request, Response } from "express";

import {
  createUser,
  getUsers,
  getUser,
  updateUserPlan,
  updateUser,
} from "../services/users.service.js";

import type {
  CreateUserInput,
  UpdateUserPlanInput,
  UpdateUserInput,
} from "../validator/users.validator.js";

// POST /api/users
export async function createUserController(
  req: Request<Record<string, never>, unknown, CreateUserInput>,
  res: Response,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;

    const user = await createUser(accountId, req.body);

    res.status(201).json(user);
  } catch (error) {
    console.error("Failed to create user:", error);

    if (error instanceof Error && error.message === "Invalid user plan") {
      res.status(400).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: "Internal server error" });
  }
}

// GET /api/users
export async function getUsersController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;

    const users = await getUsers(accountId);

    res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);

    res.status(500).json({ message: "Internal server error" });
  }
}

// GET /api/users/:id
export async function getUserController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const accountId = res.locals.account.id;

    const user = await getUser(id, accountId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);

    res.status(500).json({ message: "Internal server error" });
  }
}

// PATCH /api/users/:id/plan
export async function updateUserPlanController(
  req: Request<{ id: string }, unknown, UpdateUserPlanInput>,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const accountId = res.locals.account.id;

    const user = await updateUserPlan(id, accountId, req.body.planId);

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to update user plan:", error);

    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: error.message });
        return;
      }

      if (error.message === "Invalid user plan") {
        res.status(400).json({ message: error.message });
        return;
      }
    }

    res.status(500).json({ message: "Internal server error" });
  }
}

// PATCH /api/users/:id
export async function updateUserController(
  req: Request<{ id: string }, unknown, UpdateUserInput>,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const accountId = res.locals.account.id;

    const user = await updateUser(id, accountId, req.body);

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to update user:", error);

    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: "Internal server error" });
  }
}
