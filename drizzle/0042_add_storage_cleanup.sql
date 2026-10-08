CREATE TABLE "storage_cleanup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "storage_cleanup_storage_key_unique" ON "storage_cleanup" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "storage_cleanup_pending_idx" ON "storage_cleanup" USING btree ("deleted_at","queued_at");--> statement-breakpoint
-- Files whose rows were retired before this queue existed may still be in
-- storage, because the old delete was best-effort and never retried. Queue
-- them; deleting an object that is already gone is harmless.
INSERT INTO "storage_cleanup" ("storage_key")
SELECT "storage_key" FROM "business_media" WHERE "status" <> 'active'
UNION
SELECT "storage_key" FROM "business_document" WHERE "status" <> 'active'
ON CONFLICT ("storage_key") DO NOTHING;
