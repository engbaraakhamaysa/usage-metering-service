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
// Validate usage record route parameters
///////////////////////////////////////////////////////
export const usageRecordIdParamsSchema = z.object({
  id: z.uuid({ error: "Invalid usage record ID" }),
});

///////////////////////////////////////////////////////
// Validate usage records pagination
///////////////////////////////////////////////////////
export const usageRecordsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .positive("Page must be positive")
    .max(2_147_483_647, "Page exceeds the supported limit")
    .default(1),

  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});

///////////////////////////////////////////////////////
// Infer types from validation schemas
///////////////////////////////////////////////////////
export type ConsumeUsageInput = z.infer<typeof consumeUsageSchema>;

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export type UsageRecordIdParams = z.infer<typeof usageRecordIdParamsSchema>;

export type UsageRecordsQuery = z.infer<typeof usageRecordsQuerySchema>;
