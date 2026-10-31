ALTER TABLE "local_story" DROP CONSTRAINT "local_story_status_check";--> statement-breakpoint
ALTER TABLE "local_story" ADD COLUMN "scheduled_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "local_story" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "local_story" ADD COLUMN "image_content_type" text;--> statement-breakpoint
ALTER TABLE "local_story" ADD COLUMN "image_alt" text;--> statement-breakpoint
CREATE INDEX "local_story_due_idx" ON "local_story" USING btree ("scheduled_for") WHERE "local_story"."status" = 'scheduled';--> statement-breakpoint
ALTER TABLE "local_story" ADD CONSTRAINT "local_story_scheduled_check" CHECK ("local_story"."status" <> 'scheduled' or "local_story"."scheduled_for" is not null);--> statement-breakpoint
ALTER TABLE "local_story" ADD CONSTRAINT "local_story_image_check" CHECK ("local_story"."image_key" is null or ("local_story"."image_content_type" is not null and length(trim(coalesce("local_story"."image_alt", ''))) >= 3));--> statement-breakpoint
ALTER TABLE "local_story" ADD CONSTRAINT "local_story_status_check" CHECK ("local_story"."status" in ('draft', 'scheduled', 'published', 'archived'));