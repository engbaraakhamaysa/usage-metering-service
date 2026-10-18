import {
  findPlans,
  insertPlan,
  updatePrivatePlan,
} from "../repositories/plans.repository.js";

import type { UpdatePlanInput } from "../validator/plans.validator.js";
// Fields accepted when creating a plan.
type PlanInput = {
  name: string;
  planType: "account" | "user";
  monthlyAllowance: number;
  maxUnitsPerRequest: number;
};

// 1. Get public user plans.
export async function getPublicUserPlans() {
  return findPlans({
    planType: "user",
    ownerAccountId: null,
  });
}

// 2. Get public account plans.
export async function getPublicAccountPlans() {
  return findPlans({
    planType: "account",
    ownerAccountId: null,
  });
}

// 3. Get public and private plans available to an account.
export async function getPlansForAccount(accountId: string) {
  const [publicPlans, privatePlans] = await Promise.all([
    findPlans({
      ownerAccountId: null,
    }),
    findPlans({
      ownerAccountId: accountId,
    }),
  ]);

  return [...publicPlans, ...privatePlans];
}

// 4. Create a private plan owned by a specific account.
export async function createPrivatePlan(accountId: string, data: PlanInput) {
  return insertPlan({
    ...data,
    ownerAccountId: accountId,
  });
}

// 5. Create a public plan.
export async function createPublicPlan(data: PlanInput) {
  return insertPlan({
    ...data,
    ownerAccountId: null,
  });
}

// 6. Get a plan accessible to an account.
export async function getPlanById(id: string, accountId: string) {
  const [publicPlans, privatePlans] = await Promise.all([
    findPlans({
      id,
      ownerAccountId: null,
    }),
    findPlans({
      id,
      ownerAccountId: accountId,
    }),
  ]);

  return publicPlans[0] ?? privatePlans[0] ?? null;
}

// Get a public account plan or a private account plan owned by the account.
export async function getAccountPlanById(planId: string, accountId?: string) {
  // First, look for a public account plan.
  const publicPlans = await findPlans({
    id: planId,
    planType: "account",
    ownerAccountId: null,
  });

  if (publicPlans[0]) {
    return publicPlans[0];
  }

  // Without an account ID, private plans are not accessible.
  if (!accountId) {
    return null;
  }

  // Look for a private account plan owned by this account.
  const privatePlans = await findPlans({
    id: planId,
    planType: "account",
    ownerAccountId: accountId,
  });

  return privatePlans[0] ?? null;
}

// Update a private plan owned by a specific account.
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

// Get a public user plan or a private user plan owned by the account.
export async function getUserPlanById(planId: string, accountId?: string) {
  // First look for a public user plan.
  const publicPlans = await findPlans({
    id: planId,
    planType: "user",
    ownerAccountId: null,
  });

  if (publicPlans[0]) {
    return publicPlans[0];
  }

  // Without an account ID, private plans are not accessible.
  if (!accountId) {
    return null;
  }

  // Look for a private user plan owned by this account.
  const privatePlans = await findPlans({
    id: planId,
    planType: "user",
    ownerAccountId: accountId,
  });

  return privatePlans[0] ?? null;
}
