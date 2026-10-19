import {
  insertAccount,
  updatePlanAccount,
} from "../repositories/accounts.repository.js";
import { getPlanById } from "./plans.service.js";
import { generateApiKey } from "../utils/api-key.js";
import type { CreateAccountInput } from "../validator/accounts.validator.js";

// Create a new account.
export async function createAccount(data: CreateAccountInput) {
  const { name, planId } = data;

  // Find a public account plan by ID.
  const plan = await getPlanById(planId, "account");

  if (!plan) {
    throw new Error("Invalid account plan");
  }

  const { apiKey, apiKeyHash } = generateApiKey();

  const account = await insertAccount({
    name,
    planId: plan.id,
    apiKeyHash,
  });

  return {
    ...account,
    apiKey,
  };
}

// Change an account's plan.
export async function updateAccountPlan(accountId: string, planId: string) {
  // Find a public plan or a private plan owned by this account.
  const plan = await getPlanById(planId, "account", accountId);

  if (!plan) {
    throw new Error("Invalid account plan");
  }

  // Update the account's plan.
  const account = await updatePlanAccount(accountId, plan.id);

  if (!account) {
    throw new Error("Account not found");
  }

  return account;
}
