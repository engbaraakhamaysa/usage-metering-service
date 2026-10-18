import { z } from "zod";

// Validate data for creating a user.
export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(255),
  planId: z.uuid(),
});

// Validate data for updating a user's plan.
export const updateUserPlanSchema = z.object({
  planId: z.uuid(),
});

// Validate user ID in route parameters.
export const userIdParamsSchema = z.object({
  id: z.uuid(),
});

// Validate data for updating a user's information.
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// Types inferred from the validation schemas.
export type CreateUserInput = z.infer<typeof createUserSchema>;

export type UpdateUserPlanInput = z.infer<typeof updateUserPlanSchema>;

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
