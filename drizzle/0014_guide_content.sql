CREATE TABLE "guide" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"place_id" uuid,
	"area_label" text NOT NULL,
	"reading_time" text NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author_user_id" uuid,
	"author_name" text NOT NULL,
	"sponsorship_disclosure" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"review_due_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_status_check" CHECK ("guide"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "guide" ADD CONSTRAINT "guide_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "guide" ADD CONSTRAINT "guide_author_user_id_auth_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "guide_slug_unique" ON "guide" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "guide_status_published_idx" ON "guide" USING btree ("status","published_at");
--> statement-breakpoint
CREATE INDEX "guide_place_idx" ON "guide" USING btree ("place_id");
