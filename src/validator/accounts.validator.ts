import z from "zod";

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(255),
  planId: z.uuid(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

// Validate data for changing an account's plan.
export const updateAccountPlanSchema = z.object({
  planId: z.uuid(),
});

export type UpdateAccountPlanInput = z.infer<typeof updateAccountPlanSchema>;
