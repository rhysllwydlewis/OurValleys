CREATE TABLE IF NOT EXISTS "place_relationship" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "parent_place_id" uuid NOT NULL REFERENCES "place"("id") ON DELETE cascade,
  "child_place_id" uuid NOT NULL REFERENCES "place"("id") ON DELETE cascade,
  "relationship_type" text DEFAULT 'contains' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "place_relationship_not_self_check" CHECK ("parent_place_id" <> "child_place_id"),
  CONSTRAINT "place_relationship_type_check" CHECK ("relationship_type" IN ('contains', 'launch_cluster'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "place_relationship_parent_child_unique" ON "place_relationship" ("parent_place_id", "child_place_id");
CREATE INDEX IF NOT EXISTS "place_relationship_child_idx" ON "place_relationship" ("child_place_id");

CREATE TABLE IF NOT EXISTS "place_alias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "place_id" uuid NOT NULL REFERENCES "place"("id") ON DELETE cascade,
  "alias" text NOT NULL,
  "language" text DEFAULT 'en' NOT NULL,
  "alias_type" text DEFAULT 'search' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "place_alias_language_check" CHECK ("language" IN ('en', 'cy'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "place_alias_place_alias_language_unique" ON "place_alias" ("place_id", "alias", "language");
CREATE INDEX IF NOT EXISTS "place_alias_lookup_idx" ON "place_alias" ("alias", "status");

CREATE TABLE IF NOT EXISTS "category_relationship" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "parent_category_id" uuid NOT NULL REFERENCES "category"("id") ON DELETE cascade,
  "child_category_id" uuid NOT NULL REFERENCES "category"("id") ON DELETE cascade,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "category_relationship_not_self_check" CHECK ("parent_category_id" <> "child_category_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_relationship_parent_child_unique" ON "category_relationship" ("parent_category_id", "child_category_id");
CREATE INDEX IF NOT EXISTS "category_relationship_child_idx" ON "category_relationship" ("child_category_id");

CREATE TABLE IF NOT EXISTS "category_alias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "category"("id") ON DELETE cascade,
  "label" text NOT NULL,
  "language" text DEFAULT 'en' NOT NULL,
  "alias_type" text DEFAULT 'search' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "category_alias_language_check" CHECK ("language" IN ('en', 'cy'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_alias_category_label_language_unique" ON "category_alias" ("category_id", "label", "language");
CREATE INDEX IF NOT EXISTS "category_alias_lookup_idx" ON "category_alias" ("label", "status");

CREATE TABLE IF NOT EXISTS "business_category" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id") ON DELETE cascade,
  "category_id" uuid NOT NULL REFERENCES "category"("id") ON DELETE restrict,
  "relationship_type" text DEFAULT 'secondary' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_category_secondary_only_check" CHECK ("relationship_type" = 'secondary')
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_category_business_category_unique" ON "business_category" ("business_id", "category_id");
CREATE INDEX IF NOT EXISTS "business_category_category_idx" ON "business_category" ("category_id", "relationship_type");
