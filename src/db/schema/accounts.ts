import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { planTypeEnum } from "./plans.js";

import { sql } from "drizzle-orm";

import { plans } from "./plans.js";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: varchar("name", { length: 255 }).notNull(),

    apiKeyHash: varchar("api_key_hash", { length: 255 }).notNull().unique(),

    planId: uuid("plan_id").notNull(),

    planType: planTypeEnum("plan_type").default("account").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("accounts_plan_type_check", sql`${table.planType} = 'account'`),

    foreignKey({
      columns: [table.planId, table.planType],
      foreignColumns: [plans.id, plans.planType],
      name: "accounts_plan_type_fkey",
    }),
  ],
);
