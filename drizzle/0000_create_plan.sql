CREATE TYPE "public"."plan_type" AS ENUM('account', 'user');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"plan_type" "plan_type" NOT NULL,
	"monthly_allowance" integer NOT NULL,
	"max_units_per_request" integer NOT NULL,
	"owner_account_id" uuid,
	"parent_plan_id" uuid,
	"parent_plan_type" "plan_type" DEFAULT 'account' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_id_plan_type_unique" UNIQUE("id","plan_type"),
	CONSTRAINT "plans_monthly_allowance_positive" CHECK ("plans"."monthly_allowance" > 0),
	CONSTRAINT "plans_max_units_per_request_positive" CHECK ("plans"."max_units_per_request" > 0)
);
--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_parent_plan_account_fkey" FOREIGN KEY ("parent_plan_id","parent_plan_type") REFERENCES "public"."plans"("id","plan_type") ON DELETE no action ON UPDATE no action;