import { z } from "zod";

///////////////////////////////////////////////////////
// Validate usage consumption
///////////////////////////////////////////////////////
export const consumeUsageSchema = z.object({
  userId: z.uuid({ error: "Invalid user ID" }),

  requestId: z.uuid({ error: "Invalid request ID" }),

  requestedUnits: z
    .number()
    .int("Requested units must be an integer")
    .positive("Requested units must be positive")
    .max(2_147_483_647, "Requested units exceed the supported limit"),
});

///////////////////////////////////////////////////////
// Validate user usage route parameters
///////////////////////////////////////////////////////
export const userIdParamsSchema = consumeUsageSchema.pick({
  userId: true,
});

///////////////////////////////////////////////////////
// Validate the optional usage month
///////////////////////////////////////////////////////
export const usageQuerySchema = z.object({
  month: z
    .string()
    .regex(
      /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/,
      "Month must use YYYY-MM format with a valid year and month",
    )
    .refine((month) => month <= new Date().toISOString().slice(0, 7), {
      message: "Month cannot be in the future",
    })
    .optional(),
});

///////////////////////////////////////////////////////
// Infer types from validation schemas
///////////////////////////////////////////////////////
export type ConsumeUsageInput = z.infer<typeof consumeUsageSchema>;

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export type UsageQuery = z.infer<typeof usageQuerySchema>;
