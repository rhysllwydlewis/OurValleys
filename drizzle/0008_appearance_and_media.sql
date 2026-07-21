CREATE TABLE "business_appearance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"template_key" text DEFAULT 'standard' NOT NULL,
	"accent_key" text DEFAULT 'valley-green' NOT NULL,
	"hidden_sections" text[] DEFAULT '{}' NOT NULL,
	"section_order" text[] DEFAULT '{}' NOT NULL,
	"section_layouts" text[] DEFAULT '{}' NOT NULL,
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
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"focal_x" integer DEFAULT 50 NOT NULL,
	"focal_y" integer DEFAULT 50 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_media_role_check" CHECK ("role" IN ('logo', 'hero', 'gallery')),
	CONSTRAINT "business_media_status_check" CHECK ("status" IN ('active', 'replaced', 'removed')),
	CONSTRAINT "business_media_byte_size_check" CHECK ("byte_size" > 0),
	CONSTRAINT "business_media_focal_x_check" CHECK ("focal_x" BETWEEN 0 AND 100),
	CONSTRAINT "business_media_focal_y_check" CHECK ("focal_y" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "business_media" ADD CONSTRAINT "business_media_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_media_storage_key_unique" ON "business_media" ("storage_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "business_media_single_active_role_unique" ON "business_media" ("business_id", "role") WHERE "status" = 'active' AND "role" IN ('logo', 'hero');
--> statement-breakpoint
CREATE INDEX "business_media_role_idx" ON "business_media" ("business_id","role","sort_order");