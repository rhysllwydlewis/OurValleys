import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
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
