import type { Request, Response } from "express";

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

type CreatePlanLocals = {
  validatedBody: CreatePlanInput;
};

type UpdatePlanLocals = {
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
    const accountId = res.locals.account?.id;

    const plans = await getPlans(accountId, planType);

    res.status(200).json(plans);
  } catch (error) {
    console.error("Failed to fetch available plans:", error);

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
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const data = res.locals.validatedBody;

    const plan = await createPrivatePlan(account.id, data);

    res.status(201).json(plan);
  } catch (error) {
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
    const account = res.locals.account;

    if (!account) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const { id } = res.locals.validatedParams;
    const data = res.locals.validatedBody;

    const plan = await updatePlan(id, account.id, data);

    if (!plan) {
      res.status(404).json({
        error: "Plan not found",
      });
      return;
    }

    res.status(200).json(plan);
  } catch (error) {
    console.error("Failed to update plan:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
