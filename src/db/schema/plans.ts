import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  integer,
  timestamp,
  foreignKey,
  check,
  unique,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

export const planTypeEnum = pgEnum("plan_type", ["account", "user"]);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: varchar("name", { length: 255 }).notNull(),

    planType: planTypeEnum("plan_type").notNull(),

    monthlyAllowance: integer("monthly_allowance").notNull(),

    maxUnitsPerRequest: integer("max_units_per_request").notNull(),

    ownerAccountId: uuid("owner_account_id"),

    parentPlanId: uuid("parent_plan_id"),

    parentPlanType: planTypeEnum("parent_plan_type")
      .default("account")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("plans_id_plan_type_unique").on(table.id, table.planType),

    foreignKey({
      columns: [table.parentPlanId, table.parentPlanType],
      foreignColumns: [table.id, table.planType],
      name: "plans_parent_plan_account_fkey",
    }),

    check(
      "plans_monthly_allowance_positive",
      sql`${table.monthlyAllowance} > 0`,
    ),

    check(
      "plans_max_units_per_request_positive",
      sql`${table.maxUnitsPerRequest} > 0`,
    ),
  ],
);
