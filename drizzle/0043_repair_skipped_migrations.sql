-- Repairs databases that skipped migrations 0016 and 0017.
--
-- Drizzle applies only migrations whose journal timestamp is later than the
-- newest one already recorded. 0014 and 0015 carry timestamps later than 0016
-- and 0017, so a database that had applied 0015 before those two existed never
-- applied them, and the migrator still reported success. Every statement below
-- is idempotent: a database that did apply them (any fresh one) is unchanged.

-- From 0017_add_business_invitations: team invitations.
CREATE TABLE IF NOT EXISTS "business_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"invited_by_user_id" uuid,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"accepted_by_user_id" uuid,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_invitation_role_check" CHECK ("business_invitation"."role" in ('manager', 'editor', 'viewer')),
	CONSTRAINT "business_invitation_status_check" CHECK ("business_invitation"."status" in ('pending', 'accepted', 'revoked', 'expired'))
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_invitation_business_id_business_id_fk') THEN
		ALTER TABLE "business_invitation" ADD CONSTRAINT "business_invitation_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_invitation_invited_by_user_id_auth_user_id_fk') THEN
		ALTER TABLE "business_invitation" ADD CONSTRAINT "business_invitation_invited_by_user_id_auth_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_invitation_accepted_by_user_id_auth_user_id_fk') THEN
		ALTER TABLE "business_invitation" ADD CONSTRAINT "business_invitation_accepted_by_user_id_auth_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_invitation_token_unique" ON "business_invitation" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_invitation_business_email_pending_unique" ON "business_invitation" USING btree ("business_id","email") WHERE "business_invitation"."status" = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_invitation_business_status_idx" ON "business_invitation" USING btree ("business_id","status");--> statement-breakpoint

-- From 0016_fearless_mandarin: enquiries can be closed.
ALTER TABLE "business_enquiry" DROP CONSTRAINT IF EXISTS "business_enquiry_status_check";--> statement-breakpoint
ALTER TABLE "business_enquiry" ADD CONSTRAINT "business_enquiry_status_check" CHECK ("business_enquiry"."status" in ('new', 'read', 'replied', 'closed', 'archived', 'spam'));
