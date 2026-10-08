CREATE TABLE "business_suggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"place_text" text NOT NULL,
	"category_text" text,
	"note" text,
	"contact_email" text,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_suggestion_status_check" CHECK ("business_suggestion"."status" in ('new', 'seeded', 'already_listed', 'rejected')),
	CONSTRAINT "business_suggestion_length_check" CHECK (char_length("business_suggestion"."name") between 2 and 120
        and char_length("business_suggestion"."place_text") between 2 and 80
        and ("business_suggestion"."category_text" is null or char_length("business_suggestion"."category_text") <= 80)
        and ("business_suggestion"."note" is null or char_length("business_suggestion"."note") <= 500)
        and ("business_suggestion"."contact_email" is null or char_length("business_suggestion"."contact_email") <= 254))
);
--> statement-breakpoint
ALTER TABLE "business_suggestion" ADD CONSTRAINT "business_suggestion_reviewed_by_user_id_auth_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_suggestion_status_time_idx" ON "business_suggestion" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "business_suggestion_dedupe_idx" ON "business_suggestion" USING btree ("dedupe_key");