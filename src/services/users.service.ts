import {
  insertUser,
  findUsersByAccountId,
  findUserById,
  updateUserPlan as updateUserPlanRepository,
  updateUser as updateUserRepository,
} from "../repositories/users.repository.js";

import { getUserPlanById } from "./plans.service.js";

import type {
  CreateUserInput,
  UpdateUserInput,
} from "../validator/users.validator.js";

// 1. Create a user.
export async function createUser(accountId: string, data: CreateUserInput) {
  const { name, planId } = data;

  // Find a public user plan or a private user plan owned by this account.
  const plan = await getUserPlanById(planId, accountId);

  if (!plan) {
    throw new Error("Invalid user plan");
  }

  return insertUser({
    name,
    accountId,
    planId: plan.id,
  });
}

// 2. Get all users belonging to an account.
export async function getUsers(accountId: string) {
  return findUsersByAccountId(accountId);
}

// 3. Get a specific user belonging to an account.
export async function getUser(userId: string, accountId: string) {
  return findUserById(userId, accountId);
}

// 4. Change a user's plan.
export async function updateUserPlan(
  userId: string,
  accountId: string,
  planId: string,
) {
  const user = await findUserById(userId, accountId);

  if (!user) {
    throw new Error("User not found");
  }

  // Find a public user plan or a private user plan owned by this account.
  const plan = await getUserPlanById(planId, accountId);

  if (!plan) {
    throw new Error("Invalid user plan");
  }

  return updateUserPlanRepository(userId, accountId, plan.id);
}

// 5. Update a user's information.
export async function updateUser(
  userId: string,
  accountId: string,
  data: UpdateUserInput,
) {
  const user = await findUserById(userId, accountId);

  if (!user) {
    throw new Error("User not found");
  }

  return updateUserRepository(userId, accountId, data);
}
