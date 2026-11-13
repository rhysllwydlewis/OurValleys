CREATE TABLE "editorial_view" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"item_id" uuid NOT NULL,
	"source" text DEFAULT 'direct' NOT NULL,
	"visitor_hash" text,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_view_kind_check" CHECK ("editorial_view"."kind" in ('place', 'guide', 'story'))
);
--> statement-breakpoint
CREATE INDEX "editorial_view_item_time_idx" ON "editorial_view" USING btree ("kind","item_id","viewed_at");--> statement-breakpoint
CREATE INDEX "editorial_view_time_idx" ON "editorial_view" USING btree ("viewed_at");