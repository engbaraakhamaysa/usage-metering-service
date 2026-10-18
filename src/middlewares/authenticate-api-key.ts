import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { findAccountByApiKeyHash } from "../repositories/accounts.repository.js";

// Authenticate requests using an API key.
export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.header("x-api-key");

  if (!apiKey) {
    res.status(401).json({ message: "API key is required" });
    return;
  }

  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

  try {
    const account = await findAccountByApiKeyHash(apiKeyHash);

    if (!account) {
      res.status(401).json({ message: "Invalid API key" });
      return;
    }

    // The authenticated account will be attached to the request.
    res.locals.account = account;

    next();
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}
