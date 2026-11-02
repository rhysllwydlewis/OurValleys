CREATE TABLE "business_update" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"title_cy" text,
	"body_cy" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_update_status_check" CHECK ("business_update"."status" in ('draft', 'published')),
	CONSTRAINT "business_update_lengths_check" CHECK (char_length("business_update"."title") between 1 and 120 and char_length("business_update"."body") between 1 and 1500 and ("business_update"."title_cy" is null or char_length("business_update"."title_cy") between 1 and 120) and ("business_update"."body_cy" is null or char_length("business_update"."body_cy") between 1 and 1500)),
	CONSTRAINT "business_update_published_check" CHECK ("business_update"."status" <> 'published' or "business_update"."published_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "business_update" ADD CONSTRAINT "business_update_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_update_business_idx" ON "business_update" USING btree ("business_id","status","published_at");--> statement-breakpoint
CREATE INDEX "business_update_feed_idx" ON "business_update" USING btree ("status","published_at");