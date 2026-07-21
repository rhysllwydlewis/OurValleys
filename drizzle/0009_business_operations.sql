CREATE TABLE "business_contact_method" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "type" text NOT NULL,
  "label" text NOT NULL,
  "value" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "consent_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_contact_method_type_check" CHECK ("type" in ('call', 'email', 'enquiry', 'quote', 'callback', 'booking', 'whatsapp', 'directions', 'website', 'order'))
);
--> statement-breakpoint
ALTER TABLE "business_contact_method" ADD CONSTRAINT "business_contact_method_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_contact_method_business_idx" ON "business_contact_method" USING btree ("business_id", "enabled", "sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX "business_contact_method_one_primary_unique" ON "business_contact_method" USING btree ("business_id") WHERE "enabled" = true and "is_primary" = true;
--> statement-breakpoint

CREATE TABLE "business_enquiry" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "kind" text DEFAULT 'enquiry' NOT NULL,
  "sender_name" text NOT NULL,
  "sender_email" text,
  "sender_phone" text,
  "message" text NOT NULL,
  "preferred_time" text,
  "consent_accepted" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "source" text DEFAULT 'business_website' NOT NULL,
  "visitor_hash" text,
  "dedupe_key" text NOT NULL,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_enquiry_kind_check" CHECK ("kind" in ('enquiry', 'quote', 'callback')),
  CONSTRAINT "business_enquiry_status_check" CHECK ("status" in ('new', 'read', 'replied', 'archived', 'spam'))
);
--> statement-breakpoint
ALTER TABLE "business_enquiry" ADD CONSTRAINT "business_enquiry_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_enquiry_dedupe_unique" ON "business_enquiry" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX "business_enquiry_business_status_idx" ON "business_enquiry" USING btree ("business_id", "status", "submitted_at");
--> statement-breakpoint
CREATE INDEX "business_enquiry_rate_limit_idx" ON "business_enquiry" USING btree ("business_id", "visitor_hash", "submitted_at");
--> statement-breakpoint

CREATE TABLE "business_ticket" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "related_business_id" uuid,
  "reporter_user_id" uuid,
  "reporter_email" text,
  "type" text NOT NULL,
  "reason" text NOT NULL,
  "evidence" jsonb,
  "risk_level" text DEFAULT 'standard' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "resolution_action" text,
  "resolution_note" text,
  "assigned_to_user_id" uuid,
  "resolved_by_user_id" uuid,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_ticket_type_check" CHECK ("type" in ('claim', 'duplicate', 'correction', 'slug_change')),
  CONSTRAINT "business_ticket_risk_check" CHECK ("risk_level" in ('standard', 'high')),
  CONSTRAINT "business_ticket_status_check" CHECK ("status" in ('open', 'awaiting_information', 'approved', 'rejected', 'resolved', 'dismissed'))
);
--> statement-breakpoint
ALTER TABLE "business_ticket" ADD CONSTRAINT "business_ticket_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_ticket" ADD CONSTRAINT "business_ticket_related_business_id_business_id_fk" FOREIGN KEY ("related_business_id") REFERENCES "public"."business"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_ticket" ADD CONSTRAINT "business_ticket_reporter_user_id_auth_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_ticket" ADD CONSTRAINT "business_ticket_assigned_to_user_id_auth_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_ticket" ADD CONSTRAINT "business_ticket_resolved_by_user_id_auth_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_ticket_status_idx" ON "business_ticket" USING btree ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "business_ticket_business_idx" ON "business_ticket" USING btree ("business_id", "status");
--> statement-breakpoint

CREATE TABLE "business_ticket_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "action" text NOT NULL,
  "note" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_ticket_event" ADD CONSTRAINT "business_ticket_event_ticket_id_business_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."business_ticket"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_ticket_event" ADD CONSTRAINT "business_ticket_event_actor_user_id_auth_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_ticket_event_ticket_idx" ON "business_ticket_event" USING btree ("ticket_id");
--> statement-breakpoint

CREATE TABLE "business_offer" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "terms" text,
  "action_label" text,
  "action_url" text,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "status" text DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_offer_status_check" CHECK ("status" in ('draft', 'active', 'hidden'))
);
--> statement-breakpoint
ALTER TABLE "business_offer" ADD CONSTRAINT "business_offer_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_offer_business_idx" ON "business_offer" USING btree ("business_id", "status", "ends_at");
--> statement-breakpoint

CREATE TABLE "business_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "location_display" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone,
  "booking_url" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_event_status_check" CHECK ("status" in ('draft', 'active', 'cancelled', 'hidden'))
);
--> statement-breakpoint
ALTER TABLE "business_event" ADD CONSTRAINT "business_event_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_event_public_idx" ON "business_event" USING btree ("status", "starts_at", "ends_at");
--> statement-breakpoint
CREATE INDEX "business_event_business_idx" ON "business_event" USING btree ("business_id", "starts_at");
--> statement-breakpoint

CREATE TABLE "business_menu_group" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_menu_group_status_check" CHECK ("status" in ('active', 'hidden'))
);
--> statement-breakpoint
ALTER TABLE "business_menu_group" ADD CONSTRAINT "business_menu_group_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_menu_group_business_idx" ON "business_menu_group" USING btree ("business_id", "sort_order");
--> statement-breakpoint

CREATE TABLE "business_menu_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price_display" text,
  "dietary_labels" text[] DEFAULT '{}'::text[] NOT NULL,
  "available" boolean DEFAULT true NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_menu_item" ADD CONSTRAINT "business_menu_item_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_menu_item" ADD CONSTRAINT "business_menu_item_group_id_business_menu_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."business_menu_group"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_menu_item_group_idx" ON "business_menu_item" USING btree ("group_id", "sort_order");
--> statement-breakpoint
CREATE INDEX "business_menu_item_business_idx" ON "business_menu_item" USING btree ("business_id");
--> statement-breakpoint

CREATE TABLE "business_category_section" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "section_type" text NOT NULL,
  "title" text NOT NULL,
  "content" jsonb NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_category_section_type_check" CHECK ("section_type" in ('areas_covered', 'treatments', 'facilities', 'products', 'team', 'faq')),
  CONSTRAINT "business_category_section_status_check" CHECK ("status" in ('active', 'hidden'))
);
--> statement-breakpoint
ALTER TABLE "business_category_section" ADD CONSTRAINT "business_category_section_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_category_section_business_idx" ON "business_category_section" USING btree ("business_id", "status", "sort_order");
--> statement-breakpoint

CREATE TABLE "business_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "role" text DEFAULT 'menu' NOT NULL,
  "storage_key" text NOT NULL,
  "display_name" text NOT NULL,
  "content_type" text NOT NULL,
  "byte_size" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_document_role_check" CHECK ("role" in ('menu')),
  CONSTRAINT "business_document_status_check" CHECK ("status" in ('active', 'replaced', 'removed')),
  CONSTRAINT "business_document_byte_size_check" CHECK ("byte_size" > 0)
);
--> statement-breakpoint
ALTER TABLE "business_document" ADD CONSTRAINT "business_document_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_document_storage_key_unique" ON "business_document" USING btree ("storage_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "business_document_one_active_role_unique" ON "business_document" USING btree ("business_id", "role") WHERE "status" = 'active';
--> statement-breakpoint

CREATE TABLE "business_lifecycle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "state" text DEFAULT 'active' NOT NULL,
  "auto_publish_enabled" boolean DEFAULT false NOT NULL,
  "auto_publish_at" timestamp with time zone,
  "postponed_until" timestamp with time zone,
  "day_two_reminder_sent_at" timestamp with time zone,
  "day_seven_reminder_sent_at" timestamp with time zone,
  "pre_publish_reminder_sent_at" timestamp with time zone,
  "last_confirmed_at" timestamp with time zone,
  "next_confirmation_due_at" timestamp with time zone,
  "stale_at" timestamp with time zone,
  "paused_at" timestamp with time zone,
  "temporary_closed_until" timestamp with time zone,
  "permanently_closed_at" timestamp with time zone,
  "deletion_requested_at" timestamp with time zone,
  "deletion_warning_sent_at" timestamp with time zone,
  "delete_after" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_lifecycle_state_check" CHECK ("state" in ('active', 'paused', 'temporarily_closed', 'permanently_closed', 'deletion_pending'))
);
--> statement-breakpoint
ALTER TABLE "business_lifecycle" ADD CONSTRAINT "business_lifecycle_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_lifecycle_business_unique" ON "business_lifecycle" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX "business_lifecycle_automation_idx" ON "business_lifecycle" USING btree ("auto_publish_enabled", "auto_publish_at", "next_confirmation_due_at");
--> statement-breakpoint

CREATE TABLE "business_activity_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "source" text DEFAULT 'direct' NOT NULL,
  "visitor_hash" text,
  "metadata" jsonb,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_activity_event_type_check" CHECK ("event_type" in ('website_view', 'search_appearance', 'call_click', 'email_click', 'enquiry', 'directions_click', 'external_click', 'booking_click', 'order_click', 'qr_visit'))
);
--> statement-breakpoint
ALTER TABLE "business_activity_event" ADD CONSTRAINT "business_activity_event_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "business_activity_business_time_idx" ON "business_activity_event" USING btree ("business_id", "occurred_at");
--> statement-breakpoint
CREATE INDEX "business_activity_type_time_idx" ON "business_activity_event" USING btree ("event_type", "occurred_at");
--> statement-breakpoint

CREATE TABLE "business_entitlement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "plan_key" text DEFAULT 'free' NOT NULL,
  "capabilities" text[] DEFAULT '{}'::text[] NOT NULL,
  "limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_entitlement_plan_check" CHECK ("plan_key" in ('free', 'custom'))
);
--> statement-breakpoint
ALTER TABLE "business_entitlement" ADD CONSTRAINT "business_entitlement_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_entitlement_business_unique" ON "business_entitlement" USING btree ("business_id");
--> statement-breakpoint

CREATE TABLE "business_slug_redirect" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "from_slug" text NOT NULL,
  "to_slug" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_slug_redirect" ADD CONSTRAINT "business_slug_redirect_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_slug_redirect_from_unique" ON "business_slug_redirect" USING btree ("from_slug");
--> statement-breakpoint
CREATE INDEX "business_slug_redirect_business_idx" ON "business_slug_redirect" USING btree ("business_id");
--> statement-breakpoint

INSERT INTO "business_lifecycle" ("business_id", "last_confirmed_at", "next_confirmation_due_at")
SELECT "id", now(), now() + interval '12 months'
FROM "business"
ON CONFLICT ("business_id") DO NOTHING;
--> statement-breakpoint

INSERT INTO "business_entitlement" ("business_id", "plan_key", "capabilities", "limits")
SELECT
  "id",
  'free',
  ARRAY[
    'website',
    'directory',
    'contacts',
    'enquiries',
    'offers',
    'events',
    'menu',
    'category_sections',
    'qr',
    'basic_analytics'
  ]::text[],
  '{"galleryImages":12,"logoImages":1,"heroImages":1,"teamMembers":4,"locations":1,"activeOffers":10,"activeEvents":25}'::jsonb
FROM "business"
ON CONFLICT ("business_id") DO NOTHING;
--> statement-breakpoint

UPDATE "business_membership"
SET "permissions" = ARRAY[
  'business.view',
  'business.edit_profile',
  'business.publish',
  'business.manage_members',
  'business.manage_contacts',
  'business.manage_enquiries',
  'business.manage_content',
  'business.manage_lifecycle',
  'business.view_analytics'
]::text[]
WHERE "role" = 'manager';
--> statement-breakpoint

UPDATE "business_membership"
SET "permissions" = ARRAY[
  'business.view',
  'business.edit_profile',
  'business.manage_contacts',
  'business.manage_content'
]::text[]
WHERE "role" = 'editor';
--> statement-breakpoint

UPDATE "business_membership"
SET "permissions" = ARRAY[
  'business.view',
  'business.view_analytics'
]::text[]
WHERE "role" = 'viewer';
--> statement-breakpoint

UPDATE "business_membership"
SET "permissions" = ARRAY[
  'business.view',
  'business.edit_profile',
  'business.publish',
  'business.manage_members',
  'business.manage_contacts',
  'business.manage_enquiries',
  'business.manage_content',
  'business.manage_lifecycle',
  'business.view_analytics',
  'business.manage_claims'
]::text[]
WHERE "role" = 'owner';
