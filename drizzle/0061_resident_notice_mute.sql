CREATE TABLE "resident_notice_mute" (
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_notice_mute_pk" PRIMARY KEY("user_id","kind"),
	CONSTRAINT "resident_notice_mute_kind_check" CHECK ("resident_notice_mute"."kind" in ('saved_search_results', 'event_reminder', 'place_digest', 'owner_digest', 'followed_update', 'followed_offer', 'followed_event'))
);
--> statement-breakpoint
ALTER TABLE "resident_notice_mute" ADD CONSTRAINT "resident_notice_mute_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;