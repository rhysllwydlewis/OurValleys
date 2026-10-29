CREATE TABLE "job_cursor" (
	"name" text PRIMARY KEY NOT NULL,
	"cursor_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_notification" DROP CONSTRAINT "account_notification_kind_check";--> statement-breakpoint
ALTER TABLE "resident_saved_business" ADD COLUMN "notify" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "account_notification" ADD CONSTRAINT "account_notification_kind_check" CHECK ("account_notification"."kind" in ('saved_search_results', 'event_reminder', 'place_digest', 'owner_digest', 'followed_update', 'followed_offer', 'followed_event'));