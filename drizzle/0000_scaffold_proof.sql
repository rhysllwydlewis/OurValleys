DO $$
DECLARE
  extension_name text;
BEGIN
  FOREACH extension_name IN ARRAY ARRAY['postgis', 'pg_trgm', 'unaccent']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_available_extensions
      WHERE name = extension_name
    ) THEN
      BEGIN
        EXECUTE format('CREATE EXTENSION IF NOT EXISTS %I', extension_name);
      EXCEPTION
        WHEN insufficient_privilege THEN
          RAISE NOTICE 'Optional extension % is available but cannot be installed by the current database role; continuing without it.', extension_name;
      END;
    ELSE
      RAISE NOTICE 'Optional extension % is unavailable in this PostgreSQL image; continuing without it.', extension_name;
    END IF;
  END LOOP;
END
$$;

CREATE TABLE IF NOT EXISTS "auth_user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_email_unique" ON "auth_user" USING btree ("email");

CREATE TABLE IF NOT EXISTS "auth_session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" uuid NOT NULL REFERENCES "auth_user"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_session_token_unique" ON "auth_session" USING btree ("token");
CREATE INDEX IF NOT EXISTS "auth_session_user_idx" ON "auth_session" USING btree ("user_id");

CREATE TABLE IF NOT EXISTS "auth_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "auth_user"("id") ON DELETE cascade,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_token_expires_at" timestamp with time zone,
  "scope" text,
  "password" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_account_provider_unique" ON "auth_account" USING btree ("provider_id", "account_id");
CREATE INDEX IF NOT EXISTS "auth_account_user_idx" ON "auth_account" USING btree ("user_id");

CREATE TABLE IF NOT EXISTS "auth_verification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");

CREATE TABLE IF NOT EXISTS "scaffold_proof" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "proof_key" text NOT NULL,
  "proof_value" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "scaffold_proof_key_unique" ON "scaffold_proof" USING btree ("proof_key");
