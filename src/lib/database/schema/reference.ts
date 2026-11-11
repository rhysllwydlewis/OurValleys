import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { business, category, place } from "./business";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const placeRelationship = pgTable(
  "place_relationship",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentPlaceId: uuid("parent_place_id")
      .notNull()
      .references(() => place.id, { onDelete: "cascade" }),
    childPlaceId: uuid("child_place_id")
      .notNull()
      .references(() => place.id, { onDelete: "cascade" }),
    relationshipType: text("relationship_type").notNull().default("contains"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("place_relationship_parent_child_unique").on(
      table.parentPlaceId,
      table.childPlaceId,
    ),
    index("place_relationship_child_idx").on(table.childPlaceId),
    check(
      "place_relationship_not_self_check",
      sql`${table.parentPlaceId} <> ${table.childPlaceId}`,
    ),
    check(
      "place_relationship_type_check",
      sql`${table.relationshipType} in ('contains', 'launch_cluster')`,
    ),
  ],
);

export const placeAlias = pgTable(
  "place_alias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => place.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    language: text("language").notNull().default("en"),
    aliasType: text("alias_type").notNull().default("search"),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("place_alias_place_alias_language_unique").on(
      table.placeId,
      table.alias,
      table.language,
    ),
    index("place_alias_lookup_idx").on(table.alias, table.status),
    check("place_alias_language_check", sql`${table.language} in ('en', 'cy')`),
  ],
);

/**
 * Public locality centroids used for geographic discovery. They are never
 * business or resident addresses and can be replaced later by PostGIS points
 * without changing the versioned reference-data contract.
 */
export const placeCoordinate = pgTable(
  "place_coordinate",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => place.id, { onDelete: "cascade" }),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    source: text("source").notNull().default("versioned_reference_data"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("place_coordinate_place_unique").on(table.placeId),
    index("place_coordinate_lat_lng_idx").on(table.latitude, table.longitude),
    check(
      "place_coordinate_latitude_check",
      sql`${table.latitude} between -90 and 90`,
    ),
    check(
      "place_coordinate_longitude_check",
      sql`${table.longitude} between -180 and 180`,
    ),
  ],
);

export const categoryRelationship = pgTable(
  "category_relationship",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentCategoryId: uuid("parent_category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    childCategoryId: uuid("child_category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("category_relationship_parent_child_unique").on(
      table.parentCategoryId,
      table.childCategoryId,
    ),
    index("category_relationship_child_idx").on(table.childCategoryId),
    check(
      "category_relationship_not_self_check",
      sql`${table.parentCategoryId} <> ${table.childCategoryId}`,
    ),
  ],
);

export const categoryAlias = pgTable(
  "category_alias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    language: text("language").notNull().default("en"),
    aliasType: text("alias_type").notNull().default("search"),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("category_alias_category_label_language_unique").on(
      table.categoryId,
      table.label,
      table.language,
    ),
    index("category_alias_lookup_idx").on(table.label, table.status),
    check(
      "category_alias_language_check",
      sql`${table.language} in ('en', 'cy')`,
    ),
  ],
);

export const businessCategory = pgTable(
  "business_category",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    relationshipType: text("relationship_type").notNull().default("secondary"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_category_business_category_unique").on(
      table.businessId,
      table.categoryId,
    ),
    index("business_category_category_idx").on(
      table.categoryId,
      table.relationshipType,
    ),
    check(
      "business_category_secondary_only_check",
      sql`${table.relationshipType} = 'secondary'`,
    ),
  ],
);

/**
 * Editorial profile of a place (doc 96): a Welsh summary, longer "about" text
 * in both languages and a short list of "good to know" facts. Kept apart from
 * `place` so the directory-critical row stays small; a place without a profile
 * simply shows its editorial summary as before. Public copy only.
 */
export const placeProfile = pgTable("place_profile", {
  placeId: uuid("place_id")
    .primaryKey()
    .references(() => place.id, { onDelete: "cascade" }),
  welshSummary: text("welsh_summary"),
  about: text("about"),
  aboutCy: text("about_cy"),
  facts: jsonb("facts")
    .notNull()
    .default(sql`'[]'::jsonb`),
  // One optional editorial picture of the place (doc 98), stored in media
  // storage; the key, descriptions and credit live here, not in business_media.
  imageStorageKey: text("image_storage_key"),
  imageAlt: text("image_alt"),
  imageAltCy: text("image_alt_cy"),
  imageCredit: text("image_credit"),
  imageContentType: text("image_content_type"),
  imageByteSize: integer("image_byte_size"),
  updatedByUserId: uuid("updated_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

/**
 * A resident's suggestion for a place page (doc 97): a fact for "Good to
 * know", a correction, or better Welsh wording. Private, admin-only and never
 * published as written; an admin applies an accepted fact to the profile. No
 * contact details are collected, and the retention job removes decided rows
 * after twelve months.
 */
export const placeSuggestion = pgTable(
  "place_suggestion",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => place.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** Short heading of a suggested fact, e.g. "Market day". */
    factLabel: text("fact_label"),
    message: text("message").notNull(),
    status: text("status").notNull().default("new"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("place_suggestion_status_time_idx").on(table.status, table.createdAt),
    index("place_suggestion_place_idx").on(table.placeId),
    check(
      "place_suggestion_kind_check",
      sql`${table.kind} in ('fact', 'correction', 'welsh', 'other')`,
    ),
    check(
      "place_suggestion_status_check",
      sql`${table.status} in ('new', 'applied', 'dismissed')`,
    ),
    check(
      "place_suggestion_length_check",
      sql`char_length(${table.message}) between 3 and 500
        and (${table.factLabel} is null or char_length(${table.factLabel}) between 1 and 60)`,
    ),
  ],
);
