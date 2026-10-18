import { findPlans, insertPlan } from "../repositories/plans.repository.js";

import type { plans } from "../db/schema/plans.js";

// Fields accepted when creating a plan.
type PlanInput = Pick<
  typeof import("../db/schema/plans.js").plans.$inferInsert,
  "name" | "planType" | "monthlyAllowance" | "maxUnitsPerRequest"
>;

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

// 3. Get plans owned by a specific account.
export async function getPlansByOwner(accountId: string) {
  return findPlans({
    ownerAccountId: accountId,
  });
}

// 4. Create a private plan owned by a specific account.
export async function createPrivatePlan(accountId: string, data: PlanInput) {
  const plan = await insertPlan({
    ...data,
    ownerAccountId: accountId,
  });

  if (!plan) {
    throw new Error("Failed to create private plan");
  }

  return plan;
}

// 5. Create a public plan.
export async function createPublicPlan(data: PlanInput) {
  const plan = await insertPlan({
    ...data,
    ownerAccountId: null,
  });

  if (!plan) {
    throw new Error("Failed to create public plan");
  }

  return plan;
}

// Find a public account plan by ID.
export async function getPublicAccountPlanById(id: string) {
  const result = await findPlans({
    id,
    planType: "account",
    ownerAccountId: null,
  });

  return result[0] ?? null;
}
