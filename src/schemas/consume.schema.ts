import { z } from "zod";

// Validate the data required to consume quota
export const consumeSchema = z.object({
  userId: z.string().trim().min(1),
  units: z.number().int().positive(),
});
