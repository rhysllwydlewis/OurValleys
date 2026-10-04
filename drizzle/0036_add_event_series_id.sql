ALTER TABLE "business_event" ADD COLUMN "series_id" uuid;--> statement-breakpoint
CREATE INDEX "business_event_series_idx" ON "business_event" USING btree ("series_id");
