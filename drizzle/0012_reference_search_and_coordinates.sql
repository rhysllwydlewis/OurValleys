CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "unaccent";
--> statement-breakpoint
CREATE TABLE "place_coordinate" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "place_id" uuid NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "source" text DEFAULT 'versioned_reference_data' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "place_coordinate_latitude_check" CHECK ("place_coordinate"."latitude" between -90 and 90),
  CONSTRAINT "place_coordinate_longitude_check" CHECK ("place_coordinate"."longitude" between -180 and 180)
);
--> statement-breakpoint
ALTER TABLE "place_coordinate" ADD CONSTRAINT "place_coordinate_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "place_coordinate_place_unique" ON "place_coordinate" USING btree ("place_id");
--> statement-breakpoint
CREATE INDEX "place_coordinate_lat_lng_idx" ON "place_coordinate" USING btree ("latitude", "longitude");
--> statement-breakpoint
CREATE INDEX "business_trading_name_trgm_idx" ON "business" USING gin ("trading_name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "business_summary_trgm_idx" ON "business" USING gin ("summary" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "service_name_trgm_idx" ON "service" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "category_name_trgm_idx" ON "category" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "category_alias_label_trgm_idx" ON "category_alias" USING gin ("label" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "place_name_trgm_idx" ON "place" USING gin ("canonical_name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "place_alias_alias_trgm_idx" ON "place_alias" USING gin ("alias" gin_trgm_ops);
