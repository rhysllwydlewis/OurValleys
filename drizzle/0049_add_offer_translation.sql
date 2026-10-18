CREATE TABLE "offer_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"locale" text DEFAULT 'cy' NOT NULL,
	"title" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_translation_locale_check" CHECK ("offer_translation"."locale" in ('cy')),
	CONSTRAINT "offer_translation_title_check" CHECK ("offer_translation"."title" is null or char_length("offer_translation"."title") between 1 and 120),
	CONSTRAINT "offer_translation_description_check" CHECK ("offer_translation"."description" is null or char_length("offer_translation"."description") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "offer_translation" ADD CONSTRAINT "offer_translation_offer_id_business_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "offer_translation_offer_locale_unique" ON "offer_translation" USING btree ("offer_id","locale");