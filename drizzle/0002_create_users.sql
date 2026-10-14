CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"account_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_type" "plan_type" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_plan_type_check" CHECK ("users"."plan_type" = 'user')
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_plan_type_fkey" FOREIGN KEY ("plan_id","plan_type") REFERENCES "public"."plans"("id","plan_type") ON DELETE no action ON UPDATE no action;