import type { Request, Response } from "express";

import {
  getPublicUserPlans,
  getPublicAccountPlans,
  getPlansForAccount,
  getPlanById,
  createPrivatePlan,
  createPublicPlan,
  updatePlan,
} from "../services/plans.service.js";

import type {
  CreatePlanInput,
  UpdatePlanInput,
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

// GET /api/plans
export async function getPlansController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;

    const plans = await getPlansForAccount(accountId);

    res.status(200).json(plans);
  } catch (error) {
    console.error("Failed to fetch available plans:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

// GET /api/plans/:id
export async function getPlanByIdController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const accountId = res.locals.account.id;

    const plan = await getPlanById(id, accountId);

    if (!plan) {
      res.status(404).json({
        error: "Plan not found",
      });
      return;
    }

    res.status(200).json(plan);
  } catch (error) {
    console.error("Failed to fetch plan:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

// POST /api/plans
export async function createPrivatePlanController(
  req: Request<Record<string, never>, unknown, CreatePlanInput>,
  res: Response,
): Promise<void> {
  try {
    const accountId = res.locals.account.id;

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

// PATCH /api/plans/:id
export async function updatePlanController(
  req: Request<{ id: string }, unknown, UpdatePlanInput>,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const accountId = res.locals.account.id;

    const plan = await updatePlan(id, accountId, req.body);

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
