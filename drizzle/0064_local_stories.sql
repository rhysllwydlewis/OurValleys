CREATE TABLE "local_story" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"title_cy" text DEFAULT '' NOT NULL,
	"summary_cy" text DEFAULT '' NOT NULL,
	"body_cy" text DEFAULT '' NOT NULL,
	"place_id" uuid,
	"author_name" text NOT NULL,
	"author_user_id" uuid,
	"sponsorship_disclosure" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_story_status_check" CHECK ("local_story"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "local_story" ADD CONSTRAINT "local_story_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_story" ADD CONSTRAINT "local_story_author_user_id_auth_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "local_story_slug_unique" ON "local_story" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "local_story_status_published_idx" ON "local_story" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "local_story_place_idx" ON "local_story" USING btree ("place_id");