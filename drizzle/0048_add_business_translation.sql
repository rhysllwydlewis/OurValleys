CREATE TABLE "business_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"locale" text DEFAULT 'cy' NOT NULL,
	"summary" text,
	"description" text,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_translation_locale_check" CHECK ("business_translation"."locale" in ('cy')),
	CONSTRAINT "business_translation_summary_check" CHECK ("business_translation"."summary" is null or char_length("business_translation"."summary") between 1 and 280),
	CONSTRAINT "business_translation_description_check" CHECK ("business_translation"."description" is null or char_length("business_translation"."description") between 1 and 4000)
);
--> statement-breakpoint
CREATE TABLE "service_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"locale" text DEFAULT 'cy' NOT NULL,
	"name" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_translation_locale_check" CHECK ("service_translation"."locale" in ('cy')),
	CONSTRAINT "service_translation_name_check" CHECK ("service_translation"."name" is null or char_length("service_translation"."name") between 1 and 100),
	CONSTRAINT "service_translation_description_check" CHECK ("service_translation"."description" is null or char_length("service_translation"."description") between 1 and 280)
);
--> statement-breakpoint
ALTER TABLE "business_translation" ADD CONSTRAINT "business_translation_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_translation" ADD CONSTRAINT "business_translation_updated_by_user_id_auth_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_translation" ADD CONSTRAINT "service_translation_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_translation_business_locale_unique" ON "business_translation" USING btree ("business_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "service_translation_service_locale_unique" ON "service_translation" USING btree ("service_id","locale");