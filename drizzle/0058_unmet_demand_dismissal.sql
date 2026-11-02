CREATE TABLE "unmet_demand_dismissal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_text" text,
	"category_slug" text,
	"place_slug" text,
	"demand_key" text NOT NULL,
	"status" text NOT NULL,
	"dismissed_by_user_id" uuid,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unmet_demand_dismissal_status_check" CHECK ("unmet_demand_dismissal"."status" in ('seeded', 'out_of_scope'))
);
--> statement-breakpoint
ALTER TABLE "unmet_demand_dismissal" ADD CONSTRAINT "unmet_demand_dismissal_dismissed_by_user_id_auth_user_id_fk" FOREIGN KEY ("dismissed_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unmet_demand_dismissal_key_unique" ON "unmet_demand_dismissal" USING btree ("demand_key");--> statement-breakpoint
CREATE INDEX "unmet_demand_dismissal_time_idx" ON "unmet_demand_dismissal" USING btree ("dismissed_at");