ALTER TABLE "business_event" ADD COLUMN "is_free" boolean;--> statement-breakpoint
ALTER TABLE "business_event" ADD COLUMN "price_note" text;--> statement-breakpoint
ALTER TABLE "business_event" ADD COLUMN "step_free" boolean;--> statement-breakpoint
ALTER TABLE "business_event" ADD CONSTRAINT "business_event_price_note_check" CHECK ("business_event"."price_note" is null or char_length("business_event"."price_note") between 1 and 80);