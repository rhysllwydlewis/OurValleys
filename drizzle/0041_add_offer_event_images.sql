ALTER TABLE "business_media" DROP CONSTRAINT "business_media_role_check";--> statement-breakpoint
ALTER TABLE "business_event" ADD COLUMN "image_media_id" uuid;--> statement-breakpoint
ALTER TABLE "business_offer" ADD COLUMN "image_media_id" uuid;--> statement-breakpoint
ALTER TABLE "business_event" ADD CONSTRAINT "business_event_image_media_id_business_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."business_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_offer" ADD CONSTRAINT "business_offer_image_media_id_business_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."business_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_role_check" CHECK ("business_media"."role" in ('logo', 'hero', 'gallery', 'offer', 'event'));