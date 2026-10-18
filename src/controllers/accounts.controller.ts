import type { Request, Response } from "express";
import { createAccount } from "../services/accounts.service.js";

import type { CreateAccountInput } from "../validator/accounts.validator.js";

export async function createAccountController(
  req: Request<{}, {}, CreateAccountInput>,
  res: Response,
) {
  const { name, planId } = req.body;

  try {
    const account = await createAccount({ name, planId });

    return res.status(201).json(account);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid account plan") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
}
