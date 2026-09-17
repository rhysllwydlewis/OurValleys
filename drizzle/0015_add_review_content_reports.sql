ALTER TABLE "content_report" ALTER COLUMN "business_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "content_report" ADD COLUMN "review_id" uuid;
--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_review_id_business_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."business_review"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_single_target_check" CHECK (("content_report"."business_id" is not null) <> ("content_report"."review_id" is not null));
--> statement-breakpoint
CREATE INDEX "content_report_review_idx" ON "content_report" USING btree ("review_id","status");
