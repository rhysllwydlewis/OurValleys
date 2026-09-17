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
