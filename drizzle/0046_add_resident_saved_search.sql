CREATE TABLE "resident_saved_search" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"query_key" text NOT NULL,
	"type" text DEFAULT 'all' NOT NULL,
	"last_seen_total" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_saved_search_type_check" CHECK ("resident_saved_search"."type" in ('all', 'businesses', 'offers', 'events', 'places', 'categories', 'guides')),
	CONSTRAINT "resident_saved_search_query_check" CHECK (char_length("resident_saved_search"."query") between 2 and 80 and char_length("resident_saved_search"."query_key") between 2 and 80),
	CONSTRAINT "resident_saved_search_total_check" CHECK ("resident_saved_search"."last_seen_total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "resident_saved_search" ADD CONSTRAINT "resident_saved_search_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resident_saved_search_user_key_type_idx" ON "resident_saved_search" USING btree ("user_id","query_key","type");--> statement-breakpoint
CREATE INDEX "resident_saved_search_user_created_idx" ON "resident_saved_search" USING btree ("user_id","created_at");