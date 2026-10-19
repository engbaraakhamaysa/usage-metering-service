import { z } from "zod";
import { planTypeEnum } from "../../db/schema/enums.js";

const planTypeSchema = z.enum(planTypeEnum.enumValues);

const positiveIntegerSchema = z.number().int().positive().max(2_147_483_647);

///////////////////////////////////////////////////////
// Validate plan creation
///////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////
// Validate plan updates
///////////////////////////////////////////////////////
export const updatePlanSchema = createPlanSchema
  .pick({
    name: true,
    monthlyAllowance: true,
    maxUnitsPerRequest: true,
  })
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });

///////////////////////////////////////////////////////
// Validate route parameters
///////////////////////////////////////////////////////
export const planIdParamsSchema = z.object({
  id: z.uuid({ error: "Invalid plan ID" }),
});

///////////////////////////////////////////////////////
// Validate plan query filters
///////////////////////////////////////////////////////
export const getPlansQuerySchema = z.object({
  planType: planTypeSchema.optional(),
});

///////////////////////////////////////////////////////
// Infer types from validation schemas
///////////////////////////////////////////////////////
export type PlanType = z.infer<typeof planTypeSchema>;

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export type PlanIdParams = z.infer<typeof planIdParamsSchema>;

export type GetPlansQuery = z.infer<typeof getPlansQuerySchema>;
