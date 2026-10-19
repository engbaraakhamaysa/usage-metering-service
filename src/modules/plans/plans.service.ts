import type { plans } from "../../db/schema/plans.js";

import {
  findPlans,
  insertPlan,
  updatePrivatePlan,
} from "./plans.repository.js";

import type {
  CreatePlanInput,
  PlanType,
  UpdatePlanInput,
} from "./plans.validator.js";

type Plan = typeof plans.$inferSelect;

///////////////////////////////////////////////////////
// Get public and private plans available to an account
///////////////////////////////////////////////////////
export async function getPlans(
  accountId?: string,
  planType?: PlanType,
): Promise<Plan[]> {
  const publicPlans = await findPlans({
    ownerAccountId: null,
    planType,
  });

  if (!accountId) {
    return publicPlans;
  }

  const privatePlans = await findPlans({
    ownerAccountId: accountId,
    planType,
  });

  return [...publicPlans, ...privatePlans];
}

///////////////////////////////////////////////////////
// Create a private plan owned by a specific account
///////////////////////////////////////////////////////
export async function createPrivatePlan(
  accountId: string,
  data: CreatePlanInput,
): Promise<Plan> {
  return insertPlan({
    ...data,
    ownerAccountId: accountId,
  });
}

///////////////////////////////////////////////////////
// Update a private plan owned by a specific account
///////////////////////////////////////////////////////
export async function updatePlan(
  planId: string,
  accountId: string,
  data: UpdatePlanInput,
): Promise<Plan | null> {
  return updatePrivatePlan(planId, accountId, data);
}

///////////////////////////////////////////////////////
// Get an accessible plan by ID and optional type
///////////////////////////////////////////////////////
export async function getPlanById(
  planId: string,
  planType?: PlanType,
  accountId?: string,
): Promise<Plan | null> {
  const publicPlans = await findPlans({
    id: planId,
    planType,
    ownerAccountId: null,
  });

  if (publicPlans[0]) {
    return publicPlans[0];
  }

  if (!accountId) {
    return null;
  }

  const privatePlans = await findPlans({
    id: planId,
    planType,
    ownerAccountId: accountId,
  });

  return privatePlans[0] ?? null;
}
