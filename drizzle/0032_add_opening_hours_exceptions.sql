CREATE TABLE "opening_hours_exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_location_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"opens_at" text,
	"closes_at" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opening_hours_exception_times_check" CHECK (("opening_hours_exception"."is_closed" = true and "opening_hours_exception"."opens_at" is null and "opening_hours_exception"."closes_at" is null)
        or ("opening_hours_exception"."is_closed" = false and "opening_hours_exception"."opens_at" is not null and "opening_hours_exception"."closes_at" is not null and "opening_hours_exception"."opens_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "opening_hours_exception"."closes_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "opening_hours_exception"."opens_at" < "opening_hours_exception"."closes_at")),
	CONSTRAINT "opening_hours_exception_note_length_check" CHECK ("opening_hours_exception"."note" is null or char_length("opening_hours_exception"."note") <= 120)
);
--> statement-breakpoint
ALTER TABLE "opening_hours_exception" ADD CONSTRAINT "opening_hours_exception_business_location_id_business_location_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opening_hours_exception_location_date_unique" ON "opening_hours_exception" USING btree ("business_location_id","date");