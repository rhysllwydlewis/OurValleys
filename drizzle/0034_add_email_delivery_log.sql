CREATE TABLE "email_delivery_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_delivery_log_status_check" CHECK ("email_delivery_log"."status" in ('sent', 'failed')),
	CONSTRAINT "email_delivery_log_error_length_check" CHECK ("email_delivery_log"."error" is null or char_length("email_delivery_log"."error") <= 200)
);
--> statement-breakpoint
CREATE INDEX "email_delivery_log_time_idx" ON "email_delivery_log" USING btree ("occurred_at");