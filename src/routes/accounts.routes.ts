import { Router } from "express";
import {
  createAccountController,
  getAllAccountsController,
} from "../controllers/accounts.controller.js";

const accountsRouter = Router();

// GET /api/accounts - Get all accounts
accountsRouter.get("/api/accounts", getAllAccountsController);

// POST /api/accounts - Create a new account
accountsRouter.post("/api/accounts", createAccountController);

export default accountsRouter;
