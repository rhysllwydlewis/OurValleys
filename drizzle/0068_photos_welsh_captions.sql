ALTER TABLE "business_media" ADD COLUMN "alt_text_cy" text;--> statement-breakpoint
ALTER TABLE "business_media" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "business_media" ADD COLUMN "caption_cy" text;--> statement-breakpoint
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_alt_text_cy_check" CHECK ("business_media"."alt_text_cy" is null or char_length("business_media"."alt_text_cy") <= 300);--> statement-breakpoint
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_caption_check" CHECK ("business_media"."caption" is null or char_length("business_media"."caption") <= 160);--> statement-breakpoint
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_caption_cy_check" CHECK ("business_media"."caption_cy" is null or char_length("business_media"."caption_cy") <= 160);