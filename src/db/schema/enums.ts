import { pgEnum } from "drizzle-orm/pg-core";

export const planTypeEnum = pgEnum("plan_type", ["account", "user"]);
