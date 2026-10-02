CREATE TABLE "search_zero_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_text" text,
	"category_slug" text,
	"place_slug" text,
	"filter_count" integer DEFAULT 0 NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_zero_result_query_length_check" CHECK ("search_zero_result"."query_text" is null or char_length("search_zero_result"."query_text") <= 80),
	CONSTRAINT "search_zero_result_filter_count_check" CHECK ("search_zero_result"."filter_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX "search_zero_result_time_idx" ON "search_zero_result" USING btree ("occurred_at");