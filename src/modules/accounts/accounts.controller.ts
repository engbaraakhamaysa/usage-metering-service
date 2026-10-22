import type { Request, Response } from "express";

import type { AuthenticatedLocals } from "../../middlewares/authenticate-api-key.js";

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

type UpdateAccountPlanLocals = AuthenticatedLocals & {
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
        error: error.message,
      });
      return;
    }

    console.error("Failed to create account:", error);

    res.status(500).json({
      error: "Internal server error",
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
    const accountId = res.locals.account.id;
    const { planId } = res.locals.validatedBody;

    const updatedAccount = await updateAccountPlan(accountId, planId);

    res.status(200).json(updatedAccount);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid account plan") {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (error.message === "Account not found") {
        res.status(404).json({
          error: error.message,
        });
        return;
      }
    }

    console.error("Failed to update account plan:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
