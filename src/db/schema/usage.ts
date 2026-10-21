import {
  pgTable,
  uuid,
  date,
  integer,
  timestamp,
  check,
  foreignKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

import { accounts } from "./accounts.js";
import { users } from "./users.js";

export const usage = pgTable(
  "usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),

    userId: uuid("user_id"),

    periodStart: date("period_start").notNull(),

    usedUnits: integer("used_units").notNull().default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("usage_used_units_non_negative", sql`${table.usedUnits} >= 0`),

    foreignKey({
      columns: [table.userId, table.accountId],
      foreignColumns: [users.id, users.accountId],
      name: "usage_user_account_fkey",
    }),

    uniqueIndex("usage_account_period_unique")
      .on(table.accountId, table.periodStart)
      .where(sql`${table.userId} IS NULL`),

    uniqueIndex("usage_user_period_unique")
      .on(table.accountId, table.userId, table.periodStart)
      .where(sql`${table.userId} IS NOT NULL`),

    check(
      "usage_period_start_first_day",
      sql`EXTRACT(DAY FROM ${table.periodStart}) = 1`,
    ),
  ],
);
