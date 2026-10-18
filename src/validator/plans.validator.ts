import { z } from "zod";

// Validate data for creating a plan.
export const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required"),

  planType: z.enum(["account", "user"]),

  monthlyAllowance: z.number().int().positive(),

  maxUnitsPerRequest: z.number().int().positive(),
});

// Validate data for updating a plan.
// All fields are optional, but at least one field must be provided.
export const updatePlanSchema = createPlanSchema
  .pick({
    name: true,
    monthlyAllowance: true,
    maxUnitsPerRequest: true,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// Validate plan ID in route parameters.
export const planIdParamsSchema = z.object({
  id: z.string().uuid("Invalid plan ID"),
});

// Validate accountId in route parameters.
export const accountIdParamsSchema = z.object({
  accountId: z.string().uuid("Invalid account ID"),
});

// Type inferred from the plan creation schema.
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

// Type inferred from the plan update schema.
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// Type inferred from the plan ID schema.
export type PlanIdParams = z.infer<typeof planIdParamsSchema>;

// Type inferred from the account ID schema.
export type AccountIdParams = z.infer<typeof accountIdParamsSchema>;
