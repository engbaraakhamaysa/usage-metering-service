import {
  findAllPlans,
  findPlanById,
  insertPlan,
} from "../repositories/plans.repository.js";

// Get all plans
export async function getAllPlans() {
  return findAllPlans();
}

// Get a plan by ID
export async function getPlanById(id: string) {
  return findPlanById(id);
}

// Create a new plan
export async function createPlan(
  data: typeof import("../db/schema/plans.js").plans.$inferInsert,
) {
  return insertPlan(data);
}
