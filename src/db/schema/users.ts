import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  check,
  foreignKey,
  unique,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

import { accounts } from "./accounts.js";
import { plans } from "./plans.js";
import { planTypeEnum } from "./enums.js";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: varchar("name", { length: 255 }).notNull(),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),

    planId: uuid("plan_id").notNull(),

    planType: planTypeEnum("plan_type").notNull().default("user"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("users_plan_type_check", sql`${table.planType} = 'user'`),

    foreignKey({
      columns: [table.planId, table.planType],
      foreignColumns: [plans.id, plans.planType],
      name: "users_plan_type_fkey",
    }),

    unique("users_id_account_id_unique").on(table.id, table.accountId),

    unique("users_account_id_name_unique").on(table.accountId, table.name),
  ],
);
