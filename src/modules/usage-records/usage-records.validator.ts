import { z } from "zod";

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
export type UsageRecordIdParams = z.infer<typeof usageRecordIdParamsSchema>;

export type UsageRecordsQuery = z.infer<typeof usageRecordsQuerySchema>;
