CREATE TABLE "guide_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"locale" text DEFAULT 'cy' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"area_label" text DEFAULT '' NOT NULL,
	"reading_time" text DEFAULT '' NOT NULL,
	"sponsorship_disclosure" text DEFAULT '' NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"translated_from" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_translation_locale_check" CHECK ("guide_translation"."locale" in ('cy')),
	CONSTRAINT "guide_translation_lengths_check" CHECK (char_length("guide_translation"."title") <= 160 and char_length("guide_translation"."summary") <= 500 and char_length("guide_translation"."area_label") <= 120 and char_length("guide_translation"."reading_time") <= 60 and char_length("guide_translation"."sponsorship_disclosure") <= 300)
);
--> statement-breakpoint
ALTER TABLE "guide_translation" ADD CONSTRAINT "guide_translation_guide_id_guide_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guide_translation_guide_locale_unique" ON "guide_translation" USING btree ("guide_id","locale");