CREATE TABLE "place_suggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"fact_label" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_suggestion_kind_check" CHECK ("place_suggestion"."kind" in ('fact', 'correction', 'welsh', 'other')),
	CONSTRAINT "place_suggestion_status_check" CHECK ("place_suggestion"."status" in ('new', 'applied', 'dismissed')),
	CONSTRAINT "place_suggestion_length_check" CHECK (char_length("place_suggestion"."message") between 3 and 500
        and ("place_suggestion"."fact_label" is null or char_length("place_suggestion"."fact_label") between 1 and 60))
);
--> statement-breakpoint
ALTER TABLE "place_suggestion" ADD CONSTRAINT "place_suggestion_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_suggestion" ADD CONSTRAINT "place_suggestion_reviewed_by_user_id_auth_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "place_suggestion_status_time_idx" ON "place_suggestion" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "place_suggestion_place_idx" ON "place_suggestion" USING btree ("place_id");