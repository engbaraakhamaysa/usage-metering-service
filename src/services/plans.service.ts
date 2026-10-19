import {
  findPlans,
  insertPlan,
  updatePrivatePlan,
} from "../repositories/plans.repository.js";

import type {
  CreatePlanInput,
  PlanType,
  UpdatePlanInput,
} from "../validator/plans.validator.js";

///////////////////////////////////////////////////////
// Get public and private plans available to an account
///////////////////////////////////////////////////////
export async function getPlans(accountId?: string, planType?: PlanType) {
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

/////////////////////////////////////////////////////
// Create a private plan owned by a specific account
/////////////////////////////////////////////////////
export async function createPrivatePlan(
  accountId: string,
  data: CreatePlanInput,
) {
  return insertPlan({
    ...data,
    ownerAccountId: accountId,
  });
}

/////////////////////////////////////////////////////
// Update a private plan owned by a specific account
/////////////////////////////////////////////////////
export async function updatePlan(
  planId: string,
  accountId: string,
  data: UpdatePlanInput,
) {
  const existingPlans = await findPlans({
    id: planId,
    ownerAccountId: accountId,
  });

  if (existingPlans.length === 0) {
    return null;
  }

  return updatePrivatePlan(planId, accountId, data);
}

////////////////////////////////////
// Get a Plan By ID user or account
////////////////////////////////////
export async function getPlanById(
  planId: string,
  planType?: PlanType,
  accountId?: string,
) {
  // First, look for a public plan.
  const publicPlans = await findPlans({
    id: planId,
    planType,
    ownerAccountId: null,
  });

  if (publicPlans[0]) {
    return publicPlans[0];
  }

  // Without an account ID, private plans are not accessible.
  if (!accountId) {
    return null;
  }

  // Look for a private plan owned by this account.
  const privatePlans = await findPlans({
    id: planId,
    planType,
    ownerAccountId: accountId,
  });

  return privatePlans[0] ?? null;
}
