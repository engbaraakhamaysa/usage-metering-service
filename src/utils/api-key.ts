import { createHash, randomBytes } from "node:crypto";

export function generateApiKey() {
  const apiKey = randomBytes(32).toString("hex");
  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

  return { apiKey, apiKeyHash };
}
