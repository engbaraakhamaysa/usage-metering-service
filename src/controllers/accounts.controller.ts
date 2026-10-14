import type { Request, Response } from "express";
import {
  createAccountService,
  getAllAccountsService,
} from "../services/accounts.service.js";

// Get all accounts
export async function getAllAccountsController(req: Request, res: Response) {
  const accounts = await getAllAccountsService();

  res.status(200).json(accounts);
}

// Create a new account
export async function createAccountController(req: Request, res: Response) {
  const account = await createAccountService(req.body);

  res.status(201).json(account);
}
