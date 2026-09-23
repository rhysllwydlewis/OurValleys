ALTER TABLE "business_review" ADD COLUMN "owner_response_body" text;--> statement-breakpoint
ALTER TABLE "business_review" ADD COLUMN "owner_response_user_id" uuid;--> statement-breakpoint
ALTER TABLE "business_review" ADD COLUMN "owner_response_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_review" ADD CONSTRAINT "business_review_owner_response_user_id_auth_user_id_fk" FOREIGN KEY ("owner_response_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;