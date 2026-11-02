ALTER TABLE "business_media" DROP CONSTRAINT "business_media_role_check";--> statement-breakpoint
ALTER TABLE "business_update" DROP CONSTRAINT "business_update_status_check";--> statement-breakpoint
ALTER TABLE "business_update" ADD COLUMN "scheduled_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_update" ADD COLUMN "image_media_id" uuid;--> statement-breakpoint
ALTER TABLE "business_update" ADD CONSTRAINT "business_update_image_media_id_business_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."business_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_update_image_idx" ON "business_update" USING btree ("image_media_id");--> statement-breakpoint
CREATE INDEX "business_update_due_idx" ON "business_update" USING btree ("scheduled_for") WHERE "business_update"."status" = 'scheduled';--> statement-breakpoint
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_role_check" CHECK ("business_media"."role" in ('logo', 'hero', 'gallery', 'offer', 'event', 'update'));--> statement-breakpoint
ALTER TABLE "business_update" ADD CONSTRAINT "business_update_scheduled_check" CHECK ("business_update"."status" <> 'scheduled' or "business_update"."scheduled_for" is not null);--> statement-breakpoint
ALTER TABLE "business_update" ADD CONSTRAINT "business_update_status_check" CHECK ("business_update"."status" in ('draft', 'scheduled', 'published', 'removed'));