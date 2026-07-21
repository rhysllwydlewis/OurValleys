CREATE TABLE "business_terms_acceptance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "accepted_by_user_id" uuid NOT NULL,
  "terms_version" text NOT NULL,
  "accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_terms_acceptance" ADD CONSTRAINT "business_terms_acceptance_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_terms_acceptance" ADD CONSTRAINT "business_terms_acceptance_accepted_by_user_id_auth_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_terms_acceptance_business_unique" ON "business_terms_acceptance" USING btree ("business_id");
