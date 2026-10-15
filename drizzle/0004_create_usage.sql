CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid,
	"period_start" date NOT NULL,
	"used_units" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_used_units_non_negative" CHECK ("usage"."used_units" >= 0)
);
--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_user_account_fkey" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."users"("id","account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_account_period_unique" ON "usage" USING btree ("account_id","period_start") WHERE "usage"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_user_period_unique" ON "usage" USING btree ("account_id","user_id","period_start") WHERE "usage"."user_id" IS NOT NULL;