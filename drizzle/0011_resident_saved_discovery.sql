CREATE TABLE "resident_saved_business" (
  "user_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "resident_saved_business_user_id_business_id_pk" PRIMARY KEY("user_id", "business_id")
);
--> statement-breakpoint
CREATE TABLE "resident_saved_event" (
  "user_id" uuid NOT NULL,
  "event_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "resident_saved_event_user_id_event_id_pk" PRIMARY KEY("user_id", "event_id")
);
--> statement-breakpoint
ALTER TABLE "resident_saved_business" ADD CONSTRAINT "resident_saved_business_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "resident_saved_business" ADD CONSTRAINT "resident_saved_business_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "resident_saved_event" ADD CONSTRAINT "resident_saved_event_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "resident_saved_event" ADD CONSTRAINT "resident_saved_event_event_id_business_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."business_event"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "resident_saved_business_user_created_idx" ON "resident_saved_business" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "resident_saved_event_user_created_idx" ON "resident_saved_event" USING btree ("user_id", "created_at");
