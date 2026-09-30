ALTER TABLE "business_enquiry" ADD COLUMN "retention_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "business_enquiry_retention_idx" ON "business_enquiry" USING btree ("retention_expires_at");--> statement-breakpoint
UPDATE "business_enquiry"
SET "retention_expires_at" = CASE
  WHEN "status" = 'spam' THEN "updated_at" + interval '30 days'
  WHEN "status" IN ('closed', 'archived') THEN "updated_at" + interval '365 days'
  ELSE "submitted_at" + interval '24 months'
END
WHERE "retention_expires_at" IS NULL;