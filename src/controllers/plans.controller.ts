import type { Request, Response } from "express";

import {
  getPublicUserPlans,
  getPublicAccountPlans,
  getPlansByOwner,
  createPrivatePlan,
  createPublicPlan,
} from "../services/plans.service.js";

import type {
  CreatePlanInput,
  AccountIdParams,
} from "../validator/plans.validator.js";

// GET /api/plans/public/users
export async function getPublicUserPlansController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const plans = await getPublicUserPlans();

    res.status(200).json(plans);
  } catch (error) {
    console.error("Failed to fetch public user plans:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

// GET /api/plans/public/accounts
export async function getPublicAccountPlansController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const plans = await getPublicAccountPlans();

    res.status(200).json(plans);
  } catch (error) {
    console.error("Failed to fetch public account plans:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

// GET /api/plans/owner/:accountId
export async function getPlansByOwnerController(
  req: Request<AccountIdParams>,
  res: Response,
): Promise<void> {
  try {
    const { accountId } = req.params;

    const plans = await getPlansByOwner(accountId);

    res.status(200).json(plans);
  } catch (error) {
    console.error("Failed to fetch account plans:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

// POST /api/plans/private/:accountId
export async function createPrivatePlanController(
  req: Request<AccountIdParams, unknown, CreatePlanInput>,
  res: Response,
): Promise<void> {
  try {
    const { accountId } = req.params;

    const { name, planType, monthlyAllowance, maxUnitsPerRequest } = req.body;

    const plan = await createPrivatePlan(accountId, {
      name,
      planType,
      monthlyAllowance,
      maxUnitsPerRequest,
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error("Failed to create private plan:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

// POST /api/plans/public
export async function createPublicPlanController(
  req: Request<Record<string, never>, unknown, CreatePlanInput>,
  res: Response,
): Promise<void> {
  try {
    const { name, planType, monthlyAllowance, maxUnitsPerRequest } = req.body;

    const plan = await createPublicPlan({
      name,
      planType,
      monthlyAllowance,
      maxUnitsPerRequest,
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error("Failed to create public plan:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
