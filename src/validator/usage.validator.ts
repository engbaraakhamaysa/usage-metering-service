import { z } from "zod";

// Validate data for consuming usage.
export const consumeUsageSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),

  requestId: z.string().uuid("Invalid request ID"),

  requestedUnits: z
    .number()
    .int("Requested units must be an integer")
    .positive("Requested units must be positive"),
});

// Validate user ID in route parameters.
export const userIdParamsSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

// Validate usage record ID in route parameters.
export const usageRecordIdParamsSchema = z.object({
  id: z.string().uuid("Invalid usage record ID"),
});

// Validate pagination query parameters.
export const usageRecordsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .positive("Page must be positive")
    .default(1),

  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});

// Types inferred from validation schemas.
export type ConsumeUsageInput = z.infer<typeof consumeUsageSchema>;

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export type UsageRecordIdParams = z.infer<typeof usageRecordIdParamsSchema>;

export type UsageRecordsQuery = z.infer<typeof usageRecordsQuerySchema>;
