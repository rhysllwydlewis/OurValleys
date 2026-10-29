CREATE TABLE "account_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"href" text,
	"dedupe_key" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_notification_kind_check" CHECK ("account_notification"."kind" in ('saved_search_results', 'event_reminder', 'place_digest', 'owner_digest')),
	CONSTRAINT "account_notification_href_check" CHECK ("account_notification"."href" is null or ("account_notification"."href" like '/%' and "account_notification"."href" not like '//%' and char_length("account_notification"."href") <= 300)),
	CONSTRAINT "account_notification_dedupe_check" CHECK ("account_notification"."dedupe_key" is null or char_length("account_notification"."dedupe_key") <= 200)
);
--> statement-breakpoint
ALTER TABLE "account_notification" ADD CONSTRAINT "account_notification_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_notification_user_created_idx" ON "account_notification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "account_notification_user_unread_idx" ON "account_notification" USING btree ("user_id") WHERE "account_notification"."read_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "account_notification_user_dedupe_idx" ON "account_notification" USING btree ("user_id","dedupe_key") WHERE "account_notification"."dedupe_key" is not null;