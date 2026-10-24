import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { place } from "./business";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const guide = pgTable(
  "guide",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    placeId: uuid("place_id").references(() => place.id, {
      onDelete: "set null",
    }),
    areaLabel: text("area_label").notNull(),
    readingTime: text("reading_time").notNull(),
    sections: jsonb("sections")
      .notNull()
      .default(sql`'[]'::jsonb`),
    authorUserId: uuid("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),
    sponsorshipDisclosure: text("sponsorship_disclosure"),
    status: text("status").notNull().default("draft"),
    reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("guide_slug_unique").on(table.slug),
    index("guide_status_published_idx").on(table.status, table.publishedAt),
    index("guide_place_idx").on(table.placeId),
    check(
      "guide_status_check",
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
  ],
);

/**
 * The Welsh version of a guide, written by an admin beside the English one.
 * Sections are keyed by the stable section id so reordering the English never
 * pairs Welsh text with the wrong section. Fields may be empty while the
 * translation is in progress; readers see it only once it is complete (see
 * `src/modules/guides/welsh.ts`).
 */
export const guideTranslation = pgTable(
  "guide_translation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guide.id, { onDelete: "cascade" }),
    locale: text("locale").notNull().default("cy"),
    title: text("title").notNull().default(""),
    summary: text("summary").notNull().default(""),
    areaLabel: text("area_label").notNull().default(""),
    readingTime: text("reading_time").notNull().default(""),
    sponsorshipDisclosure: text("sponsorship_disclosure")
      .notNull()
      .default(""),
    sections: jsonb("sections")
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** The English guide's `updated_at` when this Welsh text was last saved. */
    translatedFrom: timestamp("translated_from", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("guide_translation_guide_locale_unique").on(
      table.guideId,
      table.locale,
    ),
    check("guide_translation_locale_check", sql`${table.locale} in ('cy')`),
    check(
      "guide_translation_lengths_check",
      sql`char_length(${table.title}) <= 160 and char_length(${table.summary}) <= 500 and char_length(${table.areaLabel}) <= 120 and char_length(${table.readingTime}) <= 60 and char_length(${table.sponsorshipDisclosure}) <= 300`,
    ),
  ],
);
