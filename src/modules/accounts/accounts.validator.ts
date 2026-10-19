import { z } from "zod";

///////////////////////////////////////////////////////
// Validate account creation
///////////////////////////////////////////////////////
export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(255, "Account name must be at most 255 characters"),

  planId: z.uuid({ error: "Invalid plan ID" }),
});

///////////////////////////////////////////////////////
// Validate account plan changes
///////////////////////////////////////////////////////
export const updateAccountPlanSchema = createAccountSchema.pick({
  planId: true,
});

///////////////////////////////////////////////////////
// Infer types from validation schemas
///////////////////////////////////////////////////////
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export type UpdateAccountPlanInput = z.infer<typeof updateAccountPlanSchema>;
