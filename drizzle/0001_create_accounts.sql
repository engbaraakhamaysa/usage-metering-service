CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"api_key_hash" varchar(255) NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_type" "plan_type" DEFAULT 'account' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_api_key_hash_unique" UNIQUE("api_key_hash"),
	CONSTRAINT "accounts_plan_type_check" CHECK ("accounts"."plan_type" = 'account')
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_plan_type_fkey" FOREIGN KEY ("plan_id","plan_type") REFERENCES "public"."plans"("id","plan_type") ON DELETE no action ON UPDATE no action;