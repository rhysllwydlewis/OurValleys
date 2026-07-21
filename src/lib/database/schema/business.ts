import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const category = pgTable(
  "category",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [uniqueIndex("category_slug_unique").on(table.slug)],
);

export const place = pgTable(
  "place",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    welshName: text("welsh_name"),
    slug: text("slug").notNull(),
    placeType: text("place_type").notNull(),
    coverageStatus: text("coverage_status").notNull().default("seeding"),
    editorialSummary: text("editorial_summary").notNull(),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [uniqueIndex("place_slug_unique").on(table.slug)],
);

export const business = pgTable(
  "business",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tradingName: text("trading_name").notNull(),
    legalNamePrivate: text("legal_name_private"),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    primaryCategoryId: uuid("primary_category_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    businessType: text("business_type").notNull(),
    status: text("status").notNull().default("draft"),
    claimStatus: text("claim_status").notNull().default("unclaimed"),
    verificationSummaryStatus: text("verification_summary_status")
      .notNull()
      .default("unverified"),
    publicPhone: text("public_phone"),
    publicEmail: text("public_email"),
    preferredLanguage: text("preferred_language").notNull().default("en"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdByUserId: uuid("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedByUserId: uuid("suspended_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    suspensionReason: text("suspension_reason"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_slug_unique").on(table.slug),
    index("business_category_idx").on(table.primaryCategoryId),
    index("business_public_status_idx").on(table.status, table.updatedAt),
  ],
);

export const businessMembership = pgTable(
  "business_membership",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    permissions: text("permissions").array().notNull(),
    status: text("status").notNull().default("active"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_membership_business_user_unique").on(
      table.businessId,
      table.userId,
    ),
    index("business_membership_user_idx").on(table.userId, table.status),
  ],
);

export const service = pgTable(
  "service",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    priceType: text("price_type").notNull().default("quote"),
    priceDisplay: text("price_display"),
    status: text("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("service_business_name_unique").on(
      table.businessId,
      table.name,
    ),
    index("service_business_sort_idx").on(table.businessId, table.sortOrder),
  ],
);

export const businessLocation = pgTable(
  "business_location",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    placeId: uuid("place_id")
      .notNull()
      .references(() => place.id, { onDelete: "restrict" }),
    locationType: text("location_type").notNull(),
    publicAddressLineOne: text("public_address_line_one"),
    publicLocality: text("public_locality"),
    publicPostcode: text("public_postcode"),
    privateAddressLineOne: text("private_address_line_one"),
    privatePostcode: text("private_postcode"),
    publicAddressVisibility: text("public_address_visibility")
      .notNull()
      .default("service_area_only"),
    isPrimary: boolean("is_primary").notNull().default(false),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    index("business_location_business_idx").on(
      table.businessId,
      table.isPrimary,
    ),
    uniqueIndex("business_location_one_primary_unique")
      .on(table.businessId)
      .where(sql`${table.isPrimary} = true`),
    index("business_location_place_idx").on(table.placeId, table.status),
  ],
);

export const openingHoursRule = pgTable(
  "opening_hours_rule",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessLocationId: uuid("business_location_id")
      .notNull()
      .references(() => businessLocation.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    opensAt: text("opens_at"),
    closesAt: text("closes_at"),
    isClosed: boolean("is_closed").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("opening_hours_location_day_unique").on(
      table.businessLocationId,
      table.dayOfWeek,
    ),
    check("opening_hours_day_check", sql`${table.dayOfWeek} between 0 and 6`),
  ],
);

export const businessSite = pgTable(
  "business_site",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    templateKey: text("template_key").notNull(),
    status: text("status").notNull().default("draft"),
    platformPath: text("platform_path").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_site_business_unique").on(table.businessId),
    uniqueIndex("business_site_path_unique").on(table.platformPath),
    uniqueIndex("business_site_id_business_unique").on(
      table.id,
      table.businessId,
    ),
  ],
);

export const businessPublication = pgTable(
  "business_publication",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    businessSiteId: uuid("business_site_id").notNull(),
    status: text("status").notNull().default("draft"),
    revisionNumber: integer("revision_number").notNull().default(1),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedByUserId: uuid("submitted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    moderationNote: text("moderation_note"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_publication_business_unique").on(table.businessId),
    uniqueIndex("business_publication_site_unique").on(table.businessSiteId),
    index("business_publication_status_idx").on(
      table.status,
      table.publishedAt,
    ),
    foreignKey({
      name: "business_publication_site_business_fk",
      columns: [table.businessSiteId, table.businessId],
      foreignColumns: [businessSite.id, businessSite.businessId],
    }).onDelete("cascade"),
  ],
);

export const businessAppearance = pgTable(
  "business_appearance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    templateKey: text("template_key").notNull().default("standard"),
    accentKey: text("accent_key").notNull().default("valley-green"),
    hiddenSections: text("hidden_sections").array().notNull().default([]),
    sectionOrder: text("section_order").array().notNull().default([]),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_appearance_business_unique").on(table.businessId),
  ],
);

export const businessMedia = pgTable(
  "business_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    storageKey: text("storage_key").notNull(),
    altText: text("alt_text").notNull().default(""),
    contentType: text("content_type"),
    byteSize: integer("byte_size"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    index("business_media_role_idx").on(
      table.businessId,
      table.role,
      table.sortOrder,
    ),
  ],
);
