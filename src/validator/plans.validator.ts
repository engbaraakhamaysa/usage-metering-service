import { z } from "zod";

// Validate data for creating a plan.
export const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required"),

  planType: z.enum(["account", "user"]),

  monthlyAllowance: z.number().int().positive(),

  maxUnitsPerRequest: z.number().int().positive(),
});

// Validate accountId in route parameters.
export const accountIdParamsSchema = z.object({
  accountId: z.string().uuid("Invalid account ID"),
});

// Type inferred from the plan schema.
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

// Type inferred from the account ID schema.
export type AccountIdParams = z.infer<typeof accountIdParamsSchema>;
