import type { Request, Response } from "express";
import { createAccount } from "../services/accounts.service.js";

import type { CreateAccountInput } from "../validator/accounts.validator.js";

import { updateAccountPlan } from "../services/accounts.service.js";
import type { UpdateAccountPlanInput } from "../validator/accounts.validator.js";

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

// Change an account's plan.
export async function updateAccountPlanController(
  req: Request<{}, {}, UpdateAccountPlanInput>,
  res: Response,
) {
  // We will get the account ID from API key authentication.
  const accountId = res.locals.account.id;

  const { planId } = req.body;

  try {
    const account = await updateAccountPlan(accountId, planId);

    return res.status(200).json(account);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid account plan") {
        return res.status(400).json({ message: error.message });
      }

      if (error.message === "Account not found") {
        return res.status(404).json({ message: error.message });
      }
    }

    return res.status(500).json({ message: "Internal server error" });
  }
}
