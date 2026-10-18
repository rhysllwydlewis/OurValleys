CREATE TABLE "event_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"locale" text DEFAULT 'cy' NOT NULL,
	"title" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_translation_locale_check" CHECK ("event_translation"."locale" in ('cy')),
	CONSTRAINT "event_translation_title_check" CHECK ("event_translation"."title" is null or char_length("event_translation"."title") between 1 and 160),
	CONSTRAINT "event_translation_description_check" CHECK ("event_translation"."description" is null or char_length("event_translation"."description") between 1 and 3000)
);
--> statement-breakpoint
CREATE TABLE "menu_group_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"locale" text DEFAULT 'cy' NOT NULL,
	"name" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_group_translation_locale_check" CHECK ("menu_group_translation"."locale" in ('cy')),
	CONSTRAINT "menu_group_translation_name_check" CHECK ("menu_group_translation"."name" is null or char_length("menu_group_translation"."name") between 1 and 100),
	CONSTRAINT "menu_group_translation_description_check" CHECK ("menu_group_translation"."description" is null or char_length("menu_group_translation"."description") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "menu_item_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"locale" text DEFAULT 'cy' NOT NULL,
	"name" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_item_translation_locale_check" CHECK ("menu_item_translation"."locale" in ('cy')),
	CONSTRAINT "menu_item_translation_name_check" CHECK ("menu_item_translation"."name" is null or char_length("menu_item_translation"."name") between 1 and 120),
	CONSTRAINT "menu_item_translation_description_check" CHECK ("menu_item_translation"."description" is null or char_length("menu_item_translation"."description") between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "event_translation" ADD CONSTRAINT "event_translation_event_id_business_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."business_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_group_translation" ADD CONSTRAINT "menu_group_translation_group_id_business_menu_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."business_menu_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_translation" ADD CONSTRAINT "menu_item_translation_item_id_business_menu_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."business_menu_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_translation_event_locale_unique" ON "event_translation" USING btree ("event_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_group_translation_group_locale_unique" ON "menu_group_translation" USING btree ("group_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_item_translation_item_locale_unique" ON "menu_item_translation" USING btree ("item_id","locale");