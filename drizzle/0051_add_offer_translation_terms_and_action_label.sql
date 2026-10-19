ALTER TABLE "offer_translation" ADD COLUMN "terms" text;--> statement-breakpoint
ALTER TABLE "offer_translation" ADD COLUMN "action_label" text;--> statement-breakpoint
ALTER TABLE "offer_translation" ADD CONSTRAINT "offer_translation_terms_check" CHECK ("offer_translation"."terms" is null or char_length("offer_translation"."terms") between 1 and 1000);--> statement-breakpoint
ALTER TABLE "offer_translation" ADD CONSTRAINT "offer_translation_action_label_check" CHECK ("offer_translation"."action_label" is null or char_length("offer_translation"."action_label") between 1 and 50);