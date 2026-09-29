CREATE TABLE "business_verification_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"check_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"evidence_note" text NOT NULL,
	"checked_by_user_id" uuid,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	"revoked_reason" text,
	CONSTRAINT "business_verification_check_type_check" CHECK ("business_verification_check"."check_type" in ('companies_house', 'identity', 'premises', 'trade_body', 'domain_or_social')),
	CONSTRAINT "business_verification_check_status_check" CHECK ("business_verification_check"."status" in ('active', 'revoked'))
);
--> statement-breakpoint
ALTER TABLE "business_verification_check" ADD CONSTRAINT "business_verification_check_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_verification_check" ADD CONSTRAINT "business_verification_check_checked_by_user_id_auth_user_id_fk" FOREIGN KEY ("checked_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_verification_check" ADD CONSTRAINT "business_verification_check_revoked_by_user_id_auth_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_verification_check_business_status_idx" ON "business_verification_check" USING btree ("business_id","status");