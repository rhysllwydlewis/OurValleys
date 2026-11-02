CREATE TABLE "resident_saved_offer" (
	"user_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ending_notice_at" timestamp with time zone,
	CONSTRAINT "resident_saved_offer_user_id_offer_id_pk" PRIMARY KEY("user_id","offer_id")
);
--> statement-breakpoint
ALTER TABLE "resident_notice_mute" DROP CONSTRAINT "resident_notice_mute_kind_check";--> statement-breakpoint
ALTER TABLE "account_notification" DROP CONSTRAINT "account_notification_kind_check";--> statement-breakpoint
ALTER TABLE "resident_saved_offer" ADD CONSTRAINT "resident_saved_offer_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_saved_offer" ADD CONSTRAINT "resident_saved_offer_offer_id_business_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."business_offer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resident_saved_offer_user_created_idx" ON "resident_saved_offer" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "resident_saved_offer_offer_idx" ON "resident_saved_offer" USING btree ("offer_id");--> statement-breakpoint
ALTER TABLE "resident_notice_mute" ADD CONSTRAINT "resident_notice_mute_kind_check" CHECK ("resident_notice_mute"."kind" in ('saved_search_results', 'event_reminder', 'place_digest', 'owner_digest', 'followed_update', 'followed_offer', 'followed_event', 'saved_offer_ending'));--> statement-breakpoint
ALTER TABLE "account_notification" ADD CONSTRAINT "account_notification_kind_check" CHECK ("account_notification"."kind" in ('saved_search_results', 'event_reminder', 'place_digest', 'owner_digest', 'followed_update', 'followed_offer', 'followed_event', 'saved_offer_ending'));