CREATE TABLE "place_profile" (
	"place_id" uuid PRIMARY KEY NOT NULL,
	"welsh_summary" text,
	"about" text,
	"about_cy" text,
	"facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "place_profile" ADD CONSTRAINT "place_profile_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_profile" ADD CONSTRAINT "place_profile_updated_by_user_id_auth_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;