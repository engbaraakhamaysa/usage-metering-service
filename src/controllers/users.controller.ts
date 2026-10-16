import type { Request, Response } from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
} from "../services/users.service.js";

// GET /api/users
export async function getAllUsersController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const users = await getAllUsers();

    res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

// GET /api/users/:id
export async function getUserByIdController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        error: "Invalid user ID",
      });
      return;
    }

    const user = await getUserById(id);

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

// POST /api/users
export async function createUserController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { name, accountId, planId } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof accountId !== "string" ||
      typeof planId !== "string"
    ) {
      res.status(400).json({
        error: "Invalid user data",
      });
      return;
    }

    const user = await createUser({
      name: name.trim(),
      accountId,
      planId,
      planType: "user",
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Failed to create user:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
