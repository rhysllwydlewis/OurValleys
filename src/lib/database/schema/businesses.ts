import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { categories, places } from "./reference";

export const businessStatus = pgEnum("business_status", ["draft", "published", "suspended", "archived"]);
export const businessLocationType = pgEnum("business_location_type", ["premises", "hidden_address", "service_area", "online_only"]);
export const businessMembershipRole = pgEnum("business_membership_role", ["owner", "manager", "editor"]);
export const siteRevisionStatus = pgEnum("site_revision_status", ["draft", "published", "retired"]);

export const businesses = pgTable(
  "business",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    tradingName: text("trading_name").notNull(),
    summary: text("summary").notNull(),
    description: text("description"),
    status: businessStatus("status").notNull().default("draft"),
    locationType: businessLocationType("location_type").notNull().default("service_area"),
    primaryCategoryId: uuid("primary_category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
    placeId: uuid("place_id").references(() => places.id, { onDelete: "restrict" }),
    publicEmail: text("public_email"),
    publicPhone: text("public_phone"),
    publicWebsite: text("public_website"),
    publicAddress: text("public_address"),
    serviceRadiusKm: numeric("service_radius_km", { precision: 6, scale: 2 }),
    languages: jsonb("languages").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    accessibility: jsonb("accessibility").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("business_slug_unique").on(table.slug),
    index("business_status_category_idx").on(table.status, table.primaryCategoryId),
    index("business_place_idx").on(table.placeId),
  ],
);

export const businessPrivateProfiles = pgTable("business_private_profile", {
  businessId: uuid("business_id").primaryKey().references(() => businesses.id, { onDelete: "cascade" }),
  legalName: text("legal_name"),
  accountEmail: text("account_email"),
  privateAddress: jsonb("private_address").$type<{ line1?: string; line2?: string; locality?: string; postcode?: string }>(),
  internalNotes: text("internal_notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessMemberships = pgTable(
  "business_membership",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: businessMembershipRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("business_membership_active_unique").on(table.businessId, table.userId).where(sql`${table.revokedAt} is null`),
    index("business_membership_user_idx").on(table.userId),
  ],
);

export const businessServices = pgTable(
  "business_service",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceLabel: text("price_label"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("business_service_business_sort_idx").on(table.businessId, table.sortOrder)],
);

export const businessSiteRevisions = pgTable(
  "business_site_revision",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: siteRevisionStatus("status").notNull().default("draft"),
    theme: jsonb("theme").$type<{ accent: string; surface: "light"; radius: "soft" | "square" }>().notNull().default(sql`'{"accent":"valley","surface":"light","radius":"soft"}'::jsonb`),
    sections: jsonb("sections").$type<string[]>().notNull().default(sql`'["hero","about","services","location","contact"]'::jsonb`),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("business_site_revision_version_unique").on(table.businessId, table.version),
    index("business_site_revision_status_idx").on(table.businessId, table.status),
  ],
);
