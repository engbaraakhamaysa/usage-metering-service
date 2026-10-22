import type { Request, Response } from "express";

import type { AuthenticatedLocals } from "../../middlewares/authenticate-api-key.js";

import { getPlans, createPrivatePlan, updatePlan } from "./plans.service.js";

import type {
  GetPlansQuery,
  CreatePlanInput,
  UpdatePlanInput,
  PlanIdParams,
} from "./plans.validator.js";

///////////////////////////////////////////////////////
// Define validated controller locals
///////////////////////////////////////////////////////
type GetPlansLocals = {
  validatedQuery: GetPlansQuery;
};

type GetAccountPlansLocals = AuthenticatedLocals & {
  validatedQuery: GetPlansQuery;
};

type CreatePlanLocals = AuthenticatedLocals & {
  validatedBody: CreatePlanInput;
};

type UpdatePlanLocals = AuthenticatedLocals & {
  validatedParams: PlanIdParams;
  validatedBody: UpdatePlanInput;
};

///////////////////////////////////////////////////////
// GET /api/plans
///////////////////////////////////////////////////////
export async function getPlansController(
  _req: Request,
  res: Response<unknown, GetPlansLocals>,
): Promise<void> {
  try {
    const { planType } = res.locals.validatedQuery;

    const plans = await getPlans(undefined, planType);

    res.status(200).json(plans);
  } catch (error) {
    console.error("Failed to fetch public plans:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

///////////////////////////////////////////////////////
// GET /api/plans/me
///////////////////////////////////////////////////////
export async function getAccountPlansController(
  _req: Request,
  res: Response<unknown, GetAccountPlansLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const { planType } = res.locals.validatedQuery;

    const plans = await getPlans(accountId, planType);

    res.status(200).json(plans);
  } catch (error) {
    console.error("Failed to fetch account plans:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

///////////////////////////////////////////////////////
// POST /api/plans
///////////////////////////////////////////////////////
export async function createPrivatePlanController(
  _req: Request,
  res: Response<unknown, CreatePlanLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const data = res.locals.validatedBody;

    const plan = await createPrivatePlan(accountId, data);

    res.status(201).json(plan);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Plan name already exists for this account and type"
    ) {
      res.status(409).json({
        error: error.message,
      });
      return;
    }

    console.error("Failed to create private plan:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

///////////////////////////////////////////////////////
// PATCH /api/plans/:id
///////////////////////////////////////////////////////
export async function updatePlanController(
  _req: Request,
  res: Response<unknown, UpdatePlanLocals>,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;
    const { id } = res.locals.validatedParams;
    const data = res.locals.validatedBody;

    const plan = await updatePlan(id, accountId, data);

    if (!plan) {
      res.status(404).json({
        error: "Plan not found",
      });
      return;
    }

    res.status(200).json(plan);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Plan name already exists for this account and type"
    ) {
      res.status(409).json({
        error: error.message,
      });
      return;
    }

    console.error("Failed to update plan:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
