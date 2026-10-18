import { insertAccount } from "../repositories/accounts.repository.js";
import { getPublicAccountPlanById } from "./plans.service.js";
import { generateApiKey } from "../utils/api-key.js";
import type { CreateAccountInput } from "../validator/accounts.validator.js";

export async function createAccount(data: CreateAccountInput) {
  const { name, planId } = data;

  // Find a public account plan by ID.
  const plan = await getPublicAccountPlanById(planId);

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
