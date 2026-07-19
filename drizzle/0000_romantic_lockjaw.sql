CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE TYPE "public"."business_location_type" AS ENUM('premises', 'hidden_address', 'service_area', 'online_only');--> statement-breakpoint
CREATE TYPE "public"."business_membership_role" AS ENUM('owner', 'manager', 'editor');--> statement-breakpoint
CREATE TYPE "public"."business_status" AS ENUM('draft', 'published', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."site_revision_status" AS ENUM('draft', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."coverage_state" AS ENUM('planned', 'seeding', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."place_type" AS ENUM('region', 'valley', 'town', 'village', 'neighbourhood');--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "business_membership_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "business_private_profile" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"legal_name" text,
	"account_email" text,
	"private_address" jsonb,
	"internal_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_site_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "site_revision_status" DEFAULT 'draft' NOT NULL,
	"theme" jsonb DEFAULT '{"accent":"valley","surface":"light","radius":"soft"}'::jsonb NOT NULL,
	"sections" jsonb DEFAULT '["hero","about","services","location","contact"]'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"trading_name" text NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"status" "business_status" DEFAULT 'draft' NOT NULL,
	"location_type" "business_location_type" DEFAULT 'service_area' NOT NULL,
	"primary_category_id" uuid NOT NULL,
	"place_id" uuid,
	"public_email" text,
	"public_phone" text,
	"public_website" text,
	"public_address" text,
	"service_radius_km" numeric(6, 2),
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accessibility" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_cy" text,
	"description" text,
	"synonyms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_cy" text,
	"type" "place_type" NOT NULL,
	"coverage" "coverage_state" DEFAULT 'planned' NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"coordinate" "geography(Point, 4326)",
	"source" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_membership" ADD CONSTRAINT "business_membership_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_membership" ADD CONSTRAINT "business_membership_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_private_profile" ADD CONSTRAINT "business_private_profile_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_service" ADD CONSTRAINT "business_service_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_site_revision" ADD CONSTRAINT "business_site_revision_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_primary_category_id_business_category_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."business_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_category" ADD CONSTRAINT "business_category_parent_id_business_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."business_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place" ADD CONSTRAINT "place_parent_id_place_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."place"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_account_provider_unique" ON "auth_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "auth_account_user_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_session_token_unique" ON "auth_session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_user_email_unique" ON "auth_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "business_membership_active_unique" ON "business_membership" USING btree ("business_id","user_id") WHERE "business_membership"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "business_membership_user_idx" ON "business_membership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "business_service_business_sort_idx" ON "business_service" USING btree ("business_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "business_site_revision_version_unique" ON "business_site_revision" USING btree ("business_id","version");--> statement-breakpoint
CREATE INDEX "business_site_revision_status_idx" ON "business_site_revision" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "business_slug_unique" ON "business" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "business_status_category_idx" ON "business" USING btree ("status","primary_category_id");--> statement-breakpoint
CREATE INDEX "business_place_idx" ON "business" USING btree ("place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_category_slug_unique" ON "business_category" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "business_category_parent_idx" ON "business_category" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "place_slug_unique" ON "place" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "place_parent_idx" ON "place" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "place_type_coverage_idx" ON "place" USING btree ("type","coverage");--> statement-breakpoint
CREATE INDEX "place_coordinate_gist" ON "place" USING gist ("coordinate");