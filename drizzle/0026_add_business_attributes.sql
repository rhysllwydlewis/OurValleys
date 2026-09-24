CREATE TABLE "business_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"step_free_access" boolean DEFAULT false NOT NULL,
	"accessible_toilet" boolean DEFAULT false NOT NULL,
	"hearing_loop" boolean DEFAULT false NOT NULL,
	"welsh_speaking" boolean DEFAULT false NOT NULL,
	"delivery_available" boolean DEFAULT false NOT NULL,
	"collection_available" boolean DEFAULT false NOT NULL,
	"emergency_available" boolean DEFAULT false NOT NULL,
	"appointment_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_attributes" ADD CONSTRAINT "business_attributes_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_attributes_business_unique" ON "business_attributes" USING btree ("business_id");