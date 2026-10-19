import { z } from "zod";
import { planTypeEnum } from "../db/schema/enums.js";

// Reuse the plan types defined in the Drizzle schema.
const planTypeSchema = z.enum(planTypeEnum.enumValues);

// Match PostgreSQL's positive INTEGER range.
const positiveIntegerSchema = z.number().int().positive().max(2_147_483_647);

export const createPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Plan name is required")
    .max(255, "Plan name must be at most 255 characters"),

  planType: planTypeSchema,

  monthlyAllowance: positiveIntegerSchema,

  maxUnitsPerRequest: positiveIntegerSchema,
});

// All fields are optional, but at least one must be provided.
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

// Validate account ID in route parameters.
export const accountIdParamsSchema = z.object({
  accountId: z.string().uuid("Invalid account ID"),
});

// Validate the optional plan type query parameter.
export const getPlansQuerySchema = z.object({
  planType: planTypeSchema.optional(),
});

// Infer types from the schemas instead of defining them manually.
export type PlanType = z.infer<typeof planTypeSchema>;

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export type PlanIdParams = z.infer<typeof planIdParamsSchema>;

export type AccountIdParams = z.infer<typeof accountIdParamsSchema>;

export type GetPlansQuery = z.infer<typeof getPlansQuerySchema>;
