import { Router } from "express";

import {
  consumeUsageController,
  getAccountUsageController,
  getUserUsageController,
} from "../controllers/usage.controller.js";

const router = Router();

// POST /api/usage/consume
router.post("/consume", consumeUsageController);

// GET /api/usage/account/:accountId
router.get("/account/:accountId", getAccountUsageController);

// GET /api/usage/user/:userId
router.get("/user/:userId", getUserUsageController);

export default router;
