import {
  pgTable,
  uuid,
  integer,
  timestamp,
  varchar,
  pgEnum,
  foreignKey,
  uniqueIndex,
  check,
  index,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

import { accounts } from "./accounts.js";
import { users } from "./users.js";

export const usageRecordStatusEnum = pgEnum("usage_record_status", [
  "accepted",
  "rejected",
]);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),

    userId: uuid("user_id").notNull(),

    requestId: uuid("request_id").notNull(),

    requestedUnits: integer("requested_units").notNull(),

    status: usageRecordStatusEnum("status").notNull(),

    rejectionReason: varchar("rejection_reason", { length: 100 }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId, table.accountId],
      foreignColumns: [users.id, users.accountId],
      name: "usage_records_user_account_fkey",
    }),

    uniqueIndex("usage_records_account_request_unique").on(
      table.accountId,
      table.requestId,
    ),

    check(
      "usage_records_status_reason_check",
      sql`(
        (${table.status} = 'accepted' AND ${table.rejectionReason} IS NULL)
        OR
        (${table.status} = 'rejected' AND ${table.rejectionReason} IS NOT NULL)
      )`,
    ),

    index("usage_records_account_created_at_id_idx").on(
      table.accountId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
