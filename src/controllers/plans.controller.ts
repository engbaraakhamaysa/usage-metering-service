import type { Request, Response } from "express";
import {
  createPlan,
  getAllPlans,
  getPlanById,
} from "../services/plans.service.js";

// GET /api/plans
export async function getAllPlansController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const plans = await getAllPlans();

    res.status(200).json(plans);
  } catch (error) {
    console.error("Failed to fetch plans:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}

// GET /api/plans/:id
export async function getPlanByIdController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        error: "Invalid plan ID",
      });
      return;
    }

    const plan = await getPlanById(id);

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

export async function createPlanController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      name,
      planType,
      monthlyAllowance,
      maxUnitsPerRequest,
      parentPlanId,
      parentPlanType,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !["account", "user"].includes(planType) ||
      !Number.isInteger(monthlyAllowance) ||
      monthlyAllowance <= 0 ||
      !Number.isInteger(maxUnitsPerRequest) ||
      maxUnitsPerRequest <= 0
    ) {
      res.status(400).json({
        error: "Invalid plan data",
      });
      return;
    }

    // User plans must belong to an account plan.
    if (planType === "user") {
      if (typeof parentPlanId !== "string" || parentPlanType !== "account") {
        res.status(400).json({
          error: "User plans must reference an account plan",
        });
        return;
      }

      const parentPlan = await getPlanById(parentPlanId);

      if (!parentPlan || parentPlan.planType !== "account") {
        res.status(400).json({
          error: "Parent account plan not found",
        });
        return;
      }
    }

    // Account plans cannot have a parent plan.
    if (planType === "account" && parentPlanId != null) {
      res.status(400).json({
        error: "Account plans cannot have a parent plan",
      });
      return;
    }

    const plan = await createPlan({
      name: name.trim(),
      planType: planType as "account" | "user",
      monthlyAllowance,
      maxUnitsPerRequest,
      ...(planType === "user"
        ? {
            parentPlanId,
            parentPlanType: "account" as const,
          }
        : {}),
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error("Failed to create plan:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
}
