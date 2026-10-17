import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  pgEnum,
  check,
  unique,
  AnyPgColumn,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { accounts } from "./accounts.js";

import { planTypeEnum } from "./enums.js";

// Define the plans table
export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: varchar("name", { length: 255 }).notNull(),

    planType: planTypeEnum("plan_type").notNull(),

    monthlyAllowance: integer("monthly_allowance").notNull(),

    maxUnitsPerRequest: integer("max_units_per_request").notNull(),

    ownerAccountId: uuid("owner_account_id").references(
      (): AnyPgColumn => accounts.id,
    ),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "plans_monthly_allowance_positive",
      sql`${table.monthlyAllowance} > 0`,
    ),

    check(
      "plans_max_units_per_request_positive",
      sql`${table.maxUnitsPerRequest} > 0`,
    ),

    unique("plans_id_plan_type_unique").on(table.id, table.planType),
  ],
);
