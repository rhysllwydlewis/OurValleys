CREATE TABLE "resident_preference" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_preference_locale_check" CHECK ("resident_preference"."locale" in ('en', 'cy'))
);
--> statement-breakpoint
ALTER TABLE "resident_preference" ADD CONSTRAINT "resident_preference_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;