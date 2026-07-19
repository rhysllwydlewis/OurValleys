import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(Point, 4326)";
  },
});

export const placeType = pgEnum("place_type", [
  "region",
  "valley",
  "town",
  "village",
  "neighbourhood",
]);
export const coverageState = pgEnum("coverage_state", [
  "planned",
  "seeding",
  "active",
  "retired",
]);

export const places = pgTable(
  "place",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id").references((): AnyPgColumn => places.id, {
      onDelete: "restrict",
    }),
    slug: text("slug").notNull(),
    nameEn: text("name_en").notNull(),
    nameCy: text("name_cy"),
    type: placeType("type").notNull(),
    coverage: coverageState("coverage").notNull().default("planned"),
    aliases: jsonb("aliases").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    coordinate: geographyPoint("coordinate"),
    source: text("source"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("place_slug_unique").on(table.slug),
    index("place_parent_idx").on(table.parentId),
    index("place_type_coverage_idx").on(table.type, table.coverage),
    index("place_coordinate_gist").using("gist", table.coordinate),
  ],
);

export const categories = pgTable(
  "business_category",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    slug: text("slug").notNull(),
    nameEn: text("name_en").notNull(),
    nameCy: text("name_cy"),
    description: text("description"),
    synonyms: jsonb("synonyms").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    sortOrder: integer("sort_order").notNull().default(0),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("business_category_slug_unique").on(table.slug),
    index("business_category_parent_idx").on(table.parentId),
  ],
);
