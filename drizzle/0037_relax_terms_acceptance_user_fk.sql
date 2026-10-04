ALTER TABLE "business_terms_acceptance" DROP CONSTRAINT "business_terms_acceptance_accepted_by_user_id_auth_user_id_fk";
--> statement-breakpoint
ALTER TABLE "business_terms_acceptance" ALTER COLUMN "accepted_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "business_terms_acceptance" ADD CONSTRAINT "business_terms_acceptance_accepted_by_user_id_auth_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;