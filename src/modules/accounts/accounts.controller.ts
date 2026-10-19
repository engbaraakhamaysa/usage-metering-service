import type { Request, Response } from "express";

import { createAccount, updateAccountPlan } from "./accounts.service.js";

import type {
  CreateAccountInput,
  UpdateAccountPlanInput,
} from "./accounts.validator.js";

///////////////////////////////////////////////////////
// Define validated controller locals
///////////////////////////////////////////////////////
type CreateAccountLocals = {
  validatedBody: CreateAccountInput;
};

type UpdateAccountPlanLocals = {
  validatedBody: UpdateAccountPlanInput;
};

///////////////////////////////////////////////////////
// POST /api/accounts
///////////////////////////////////////////////////////
export async function createAccountController(
  _req: Request,
  res: Response<unknown, CreateAccountLocals>,
): Promise<void> {
  try {
    const data = res.locals.validatedBody;

    const account = await createAccount(data);

    res.status(201).json(account);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid account plan") {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    console.error("Failed to create account:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

///////////////////////////////////////////////////////
// PATCH /api/accounts/me/plan
///////////////////////////////////////////////////////
export async function updateAccountPlanController(
  _req: Request,
  res: Response<unknown, UpdateAccountPlanLocals>,
): Promise<void> {
  try {
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const { planId } = res.locals.validatedBody;

    const updatedAccount = await updateAccountPlan(account.id, planId);

    res.status(200).json(updatedAccount);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid account plan") {
        res.status(400).json({
          message: error.message,
        });
        return;
      }

      if (error.message === "Account not found") {
        res.status(404).json({
          message: error.message,
        });
        return;
      }
    }

    console.error("Failed to update account plan:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}
