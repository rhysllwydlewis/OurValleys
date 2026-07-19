CREATE TABLE IF NOT EXISTS "category" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_slug_unique" ON "category" ("slug");

CREATE TABLE IF NOT EXISTS "place" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "canonical_name" text NOT NULL,
  "welsh_name" text,
  "slug" text NOT NULL,
  "place_type" text NOT NULL,
  "coverage_status" text DEFAULT 'seeding' NOT NULL,
  "editorial_summary" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "place_slug_unique" ON "place" ("slug");

CREATE TABLE IF NOT EXISTS "business" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trading_name" text NOT NULL,
  "legal_name_private" text,
  "slug" text NOT NULL,
  "summary" text NOT NULL,
  "description" text NOT NULL,
  "primary_category_id" uuid NOT NULL REFERENCES "category"("id") ON DELETE restrict,
  "business_type" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "claim_status" text DEFAULT 'unclaimed' NOT NULL,
  "verification_summary_status" text DEFAULT 'unverified' NOT NULL,
  "public_phone" text,
  "public_email" text,
  "preferred_language" text DEFAULT 'en' NOT NULL,
  "is_demo" boolean DEFAULT false NOT NULL,
  "created_by_user_id" uuid REFERENCES "auth_user"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_slug_unique" ON "business" ("slug");
CREATE INDEX IF NOT EXISTS "business_category_idx" ON "business" ("primary_category_id");
CREATE INDEX IF NOT EXISTS "business_public_status_idx" ON "business" ("status", "updated_at");

CREATE TABLE IF NOT EXISTS "business_membership" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "auth_user"("id") ON DELETE cascade,
  "role" text NOT NULL,
  "permissions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_membership_business_user_unique" ON "business_membership" ("business_id", "user_id");
CREATE INDEX IF NOT EXISTS "business_membership_user_idx" ON "business_membership" ("user_id", "status");

CREATE TABLE IF NOT EXISTS "service" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "price_type" text DEFAULT 'quote' NOT NULL,
  "price_display" text,
  "status" text DEFAULT 'active' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_business_name_unique" ON "service" ("business_id", "name");
CREATE INDEX IF NOT EXISTS "service_business_sort_idx" ON "service" ("business_id", "sort_order");

CREATE TABLE IF NOT EXISTS "business_location" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id") ON DELETE cascade,
  "place_id" uuid NOT NULL REFERENCES "place"("id") ON DELETE restrict,
  "location_type" text NOT NULL,
  "public_address_line_one" text,
  "public_locality" text,
  "public_postcode" text,
  "private_address_line_one" text,
  "private_postcode" text,
  "public_address_visibility" text DEFAULT 'service_area_only' NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "business_location_business_idx" ON "business_location" ("business_id", "is_primary");
CREATE INDEX IF NOT EXISTS "business_location_place_idx" ON "business_location" ("place_id", "status");

CREATE TABLE IF NOT EXISTS "opening_hours_rule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_location_id" uuid NOT NULL REFERENCES "business_location"("id") ON DELETE cascade,
  "day_of_week" integer NOT NULL,
  "opens_at" text,
  "closes_at" text,
  "is_closed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "opening_hours_day_check" CHECK ("day_of_week" BETWEEN 0 AND 6)
);

CREATE UNIQUE INDEX IF NOT EXISTS "opening_hours_location_day_unique" ON "opening_hours_rule" ("business_location_id", "day_of_week");

CREATE TABLE IF NOT EXISTS "business_site" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id") ON DELETE cascade,
  "template_key" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "platform_path" text NOT NULL,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_site_business_unique" ON "business_site" ("business_id");
CREATE UNIQUE INDEX IF NOT EXISTS "business_site_path_unique" ON "business_site" ("platform_path");

CREATE TABLE IF NOT EXISTS "business_publication" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id") ON DELETE cascade,
  "business_site_id" uuid NOT NULL REFERENCES "business_site"("id") ON DELETE cascade,
  "status" text DEFAULT 'draft' NOT NULL,
  "revision_number" integer DEFAULT 1 NOT NULL,
  "published_at" timestamp with time zone,
  "last_reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_publication_business_unique" ON "business_publication" ("business_id");
CREATE UNIQUE INDEX IF NOT EXISTS "business_publication_site_unique" ON "business_publication" ("business_site_id");
CREATE INDEX IF NOT EXISTS "business_publication_status_idx" ON "business_publication" ("status", "published_at");
