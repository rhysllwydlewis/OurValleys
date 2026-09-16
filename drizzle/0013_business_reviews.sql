CREATE TABLE "business_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text,
	"status" text DEFAULT 'published' NOT NULL,
	"hidden_by_user_id" uuid,
	"hidden_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_review_rating_range_check" CHECK ("business_review"."rating" between 1 and 5),
	CONSTRAINT "business_review_status_check" CHECK ("business_review"."status" in ('published', 'hidden'))
);
--> statement-breakpoint
ALTER TABLE "business_review" ADD CONSTRAINT "business_review_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_review" ADD CONSTRAINT "business_review_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_review" ADD CONSTRAINT "business_review_hidden_by_user_id_auth_user_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_review_business_user_unique" ON "business_review" USING btree ("business_id","user_id");
--> statement-breakpoint
CREATE INDEX "business_review_business_status_idx" ON "business_review" USING btree ("business_id","status","created_at");
