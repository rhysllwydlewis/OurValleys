CREATE TABLE IF NOT EXISTS "business_onboarding_draft" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "business"("id") ON DELETE cascade,
  "version" integer DEFAULT 0 NOT NULL,
  "profile" jsonb,
  "location" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_onboarding_draft_version_check" CHECK ("version" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_onboarding_draft_business_unique" ON "business_onboarding_draft" ("business_id");
CREATE INDEX IF NOT EXISTS "business_onboarding_draft_updated_idx" ON "business_onboarding_draft" ("updated_at");
