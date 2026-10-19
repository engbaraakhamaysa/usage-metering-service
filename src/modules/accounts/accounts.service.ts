import {
  insertAccount,
  updatePlanAccount,
  type AccountResult,
} from "./accounts.repository.js";

import { getPlanById } from "../plans/plans.service.js";
import { generateApiKey } from "../../utils/api-key.js";

import type { CreateAccountInput } from "./accounts.validator.js";

type CreateAccountResult = AccountResult & {
  apiKey: string;
};

///////////////////////////////////////////////////////
// Create an account using a public account plan
///////////////////////////////////////////////////////
export async function createAccount(
  data: CreateAccountInput,
): Promise<CreateAccountResult> {
  const { name, planId } = data;

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

///////////////////////////////////////////////////////
// Change an account's plan to an accessible account plan
///////////////////////////////////////////////////////
export async function updateAccountPlan(
  accountId: string,
  planId: string,
): Promise<AccountResult> {
  const plan = await getPlanById(planId, "account", accountId);

  if (!plan) {
    throw new Error("Invalid account plan");
  }

  const account = await updatePlanAccount(accountId, plan.id);

  if (!account) {
    throw new Error("Account not found");
  }

  return account;
}
