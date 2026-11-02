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
import { user } from "./auth";
import { place } from "./business";

/**
 * A short local news story written by a platform admin. Plain text only: the
 * body is paragraphs separated by blank lines, with `## ` lines as sub-headings
 * (see `src/modules/stories/model.ts`). The Welsh version lives in the `*_cy`
 * columns and is shown to Welsh readers only once the title, summary and body
 * are all present.
 */
export const localStory = pgTable(
  "local_story",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    titleCy: text("title_cy").notNull().default(""),
    summaryCy: text("summary_cy").notNull().default(""),
    bodyCy: text("body_cy").notNull().default(""),
    placeId: uuid("place_id").references(() => place.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),
    authorUserId: uuid("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    sponsorshipDisclosure: text("sponsorship_disclosure"),
    // One optional picture owned by the story (not a business_media row).
    imageStorageKey: text("image_storage_key"),
    imageAlt: text("image_alt"),
    imageAltCy: text("image_alt_cy"),
    imageContentType: text("image_content_type"),
    imageByteSize: integer("image_byte_size"),
    status: text("status").notNull().default("draft"),
    /** Set only while `status` is `scheduled`: when the worker makes it live. */
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("local_story_slug_unique").on(table.slug),
    index("local_story_status_published_idx").on(
      table.status,
      table.publishedAt,
    ),
    index("local_story_place_idx").on(table.placeId),
    check(
      "local_story_status_check",
      sql`${table.status} in ('draft', 'scheduled', 'published', 'archived')`,
    ),
    check(
      "local_story_scheduled_check",
      sql`${table.status} <> 'scheduled' or ${table.scheduledFor} is not null`,
    ),
    check(
      "local_story_image_check",
      sql`(${table.imageStorageKey} is null) = (${table.imageAlt} is null)`,
    ),
    index("local_story_due_idx")
      .on(table.scheduledFor)
      .where(sql`${table.status} = 'scheduled'`),
  ],
);
