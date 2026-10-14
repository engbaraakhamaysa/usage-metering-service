import {
  createAccount,
  getAllAccounts,
} from "../repositories/accounts.repository.js";

// Get all accounts
export async function getAllAccountsService() {
  return getAllAccounts();
}

// Create a new account
export async function createAccountService(
  data: typeof import("../db/schema/accounts.js").accounts.$inferInsert,
) {
  return createAccount(data);
}
