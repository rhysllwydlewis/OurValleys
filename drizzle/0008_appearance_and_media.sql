CREATE TABLE "business_appearance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"template_key" text DEFAULT 'standard' NOT NULL,
	"accent_key" text DEFAULT 'valley-green' NOT NULL,
	"hidden_sections" text[] DEFAULT '{}' NOT NULL,
	"section_order" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_appearance_business_unique" UNIQUE("business_id")
);
--> statement-breakpoint
ALTER TABLE "business_appearance" ADD CONSTRAINT "business_appearance_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "business_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"role" text NOT NULL,
	"storage_key" text NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"content_type" text,
	"byte_size" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_media_role_idx" ON "business_media" ("business_id","role","sort_order");
