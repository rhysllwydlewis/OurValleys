ALTER TABLE "auth_user"
  ADD COLUMN "role" text DEFAULT 'user' NOT NULL,
  ADD COLUMN "banned" boolean DEFAULT false NOT NULL,
  ADD COLUMN "ban_reason" text,
  ADD COLUMN "ban_expires" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "auth_user_role_idx" ON "auth_user" USING btree ("role");
--> statement-breakpoint
ALTER TABLE "auth_session"
  ADD COLUMN "impersonated_by" text;
--> statement-breakpoint
ALTER TABLE "business"
  ADD COLUMN "suspended_at" timestamp with time zone,
  ADD COLUMN "suspended_by_user_id" uuid,
  ADD COLUMN "suspension_reason" text;
--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_suspended_by_user_id_auth_user_id_fk" FOREIGN KEY ("suspended_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_publication"
  ADD COLUMN "submitted_at" timestamp with time zone,
  ADD COLUMN "submitted_by_user_id" uuid,
  ADD COLUMN "reviewed_by_user_id" uuid,
  ADD COLUMN "moderation_note" text;
--> statement-breakpoint
ALTER TABLE "business_publication" ADD CONSTRAINT "business_publication_submitted_by_user_id_auth_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_publication" ADD CONSTRAINT "business_publication_reviewed_by_user_id_auth_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_user_id_auth_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "admin_audit_log_actor_idx" ON "admin_audit_log" USING btree ("actor_user_id");
--> statement-breakpoint
CREATE TABLE "content_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"reporter_user_id" uuid,
	"reporter_email" text,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by_user_id" uuid,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_reporter_user_id_auth_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_resolved_by_user_id_auth_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "content_report_business_idx" ON "content_report" USING btree ("business_id","status");
--> statement-breakpoint
CREATE INDEX "content_report_status_idx" ON "content_report" USING btree ("status","created_at");
