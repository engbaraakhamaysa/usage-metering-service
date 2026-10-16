CREATE TYPE "public"."usage_record_status" AS ENUM('accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"requested_units" integer NOT NULL,
	"status" "usage_record_status" NOT NULL,
	"rejection_reason" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_records_status_reason_check" CHECK ((
        ("usage_records"."status" = 'accepted' AND "usage_records"."rejection_reason" IS NULL)
        OR
        ("usage_records"."status" = 'rejected' AND "usage_records"."rejection_reason" IS NOT NULL)
      ))
);
--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_account_fkey" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."users"("id","account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_records_account_request_unique" ON "usage_records" USING btree ("account_id","request_id");