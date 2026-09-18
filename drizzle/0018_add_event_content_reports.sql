ALTER TABLE "content_report" DROP CONSTRAINT "content_report_single_target_check";--> statement-breakpoint
ALTER TABLE "content_report" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_event_id_business_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."business_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_report_event_idx" ON "content_report" USING btree ("event_id","status");--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_single_target_check" CHECK ((
        (case when "content_report"."business_id" is not null then 1 else 0 end) +
        (case when "content_report"."review_id" is not null then 1 else 0 end) +
        (case when "content_report"."event_id" is not null then 1 else 0 end)
      ) = 1);