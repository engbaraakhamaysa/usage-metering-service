import type { Request, Response } from "express";

import { getAccountUsage, getUserUsage } from "../services/usage.service.js";

import { consumeUsageWithRecord } from "../services/usage-records.service.js";

// GET /api/usage/account/:accountId
export async function getAccountUsageController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { accountId } = req.params;

    if (typeof accountId !== "string") {
      res.status(400).json({ error: "Invalid account ID" });
      return;
    }

    const result = await getAccountUsage(accountId);

    if (!result.success) {
      res.status(result.status).json({ error: result.message });
      return;
    }

    res.status(200).json(result.data);
  } catch (error) {
    console.error("Failed to fetch account usage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/usage/user/:userId
export async function getUserUsageController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const result = await getUserUsage(userId);

    if (!result.success) {
      res.status(result.status).json({ error: result.message });
      return;
    }

    res.status(200).json(result.data);
  } catch (error) {
    console.error("Failed to fetch user usage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/usage/consume
export async function consumeUsageController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { accountId, userId, requestId, units } = req.body;

    // Validate request data
    if (
      typeof accountId !== "string" ||
      typeof userId !== "string" ||
      typeof requestId !== "string" ||
      !requestId.trim() ||
      typeof units !== "number" ||
      !Number.isInteger(units) ||
      units <= 0
    ) {
      res.status(400).json({ error: "Invalid usage data" });
      return;
    }

    const result = await consumeUsageWithRecord(
      accountId,
      userId,
      requestId,
      units,
    );

    if (!result.success) {
      res.status(result.status).json({
        error: result.message,
        ...("data" in result ? { data: result.data } : {}),
      });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to consume usage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
