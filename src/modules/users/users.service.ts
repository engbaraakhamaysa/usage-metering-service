import {
  insertUser,
  findUsersByAccountId,
  findUserById,
  updateUserPlan as updateUserPlanRepository,
  type UserResult,
} from "./users.repository.js";

import { getPlanById } from "../plans/plans.service.js";

import type { CreateUserInput } from "./users.validator.js";

///////////////////////////////////////////////////////
// Create a user belonging to a specific account
///////////////////////////////////////////////////////
export async function createUser(
  accountId: string,
  data: CreateUserInput,
): Promise<UserResult> {
  const { name, planId } = data;

  const plan = await getPlanById(planId, "user", accountId);

  if (!plan) {
    throw new Error("Invalid user plan");
  }

  return insertUser({
    name,
    accountId,
    planId: plan.id,
  });
}

///////////////////////////////////////////////////////
// Get all users belonging to a specific account
///////////////////////////////////////////////////////
export async function getUsers(accountId: string): Promise<UserResult[]> {
  return findUsersByAccountId(accountId);
}

///////////////////////////////////////////////////////
// Get a specific user belonging to a specific account
///////////////////////////////////////////////////////
export async function getUser(
  userId: string,
  accountId: string,
): Promise<UserResult | null> {
  return findUserById(userId, accountId);
}

///////////////////////////////////////////////////////
// Change a user's plan to an accessible user plan
///////////////////////////////////////////////////////
export async function updateUserPlan(
  userId: string,
  accountId: string,
  planId: string,
): Promise<UserResult> {
  const user = await findUserById(userId, accountId);

  if (!user) {
    throw new Error("User not found");
  }

  const plan = await getPlanById(planId, "user", accountId);

  if (!plan) {
    throw new Error("Invalid user plan");
  }

  const updatedUser = await updateUserPlanRepository(
    userId,
    accountId,
    plan.id,
  );

  if (!updatedUser) {
    throw new Error("User not found");
  }

  return updatedUser;
}
