ALTER TABLE "business_offer" DROP CONSTRAINT "business_offer_status_check";--> statement-breakpoint
ALTER TABLE "business_update" DROP CONSTRAINT "business_update_status_check";--> statement-breakpoint
ALTER TABLE "content_report" DROP CONSTRAINT "content_report_single_target_check";--> statement-breakpoint
ALTER TABLE "content_report" ADD COLUMN "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "content_report" ADD COLUMN "update_id" uuid;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_offer_id_business_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_update_id_business_update_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."business_update"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_report_offer_idx" ON "content_report" USING btree ("offer_id","status");--> statement-breakpoint
CREATE INDEX "content_report_update_idx" ON "content_report" USING btree ("update_id","status");--> statement-breakpoint
ALTER TABLE "business_offer" ADD CONSTRAINT "business_offer_status_check" CHECK ("business_offer"."status" in ('draft', 'active', 'hidden', 'removed'));--> statement-breakpoint
ALTER TABLE "business_update" ADD CONSTRAINT "business_update_status_check" CHECK ("business_update"."status" in ('draft', 'published', 'removed'));--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_single_target_check" CHECK ((
        (case when "content_report"."business_id" is not null then 1 else 0 end) +
        (case when "content_report"."review_id" is not null then 1 else 0 end) +
        (case when "content_report"."event_id" is not null then 1 else 0 end) +
        (case when "content_report"."offer_id" is not null then 1 else 0 end) +
        (case when "content_report"."update_id" is not null then 1 else 0 end)
      ) = 1);