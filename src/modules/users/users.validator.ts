import { z } from "zod";

///////////////////////////////////////////////////////
// Validate user creation
///////////////////////////////////////////////////////
export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "User name is required")
    .max(255, "User name must be at most 255 characters"),

  planId: z.uuid({ error: "Invalid plan ID" }),
});

///////////////////////////////////////////////////////
// Validate user plan changes
///////////////////////////////////////////////////////
export const updateUserPlanSchema = createUserSchema.pick({
  planId: true,
});

///////////////////////////////////////////////////////
// Validate route parameters
///////////////////////////////////////////////////////
export const userIdParamsSchema = z.object({
  id: z.uuid({ error: "Invalid user ID" }),
});

///////////////////////////////////////////////////////
// Infer types from validation schemas
///////////////////////////////////////////////////////
export type CreateUserInput = z.infer<typeof createUserSchema>;

export type UpdateUserPlanInput = z.infer<typeof updateUserPlanSchema>;

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
