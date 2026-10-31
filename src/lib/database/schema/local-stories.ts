import { sql } from "drizzle-orm";
import {
  check,
  index,
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
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** When a scheduled story goes live; only set while `status` is "scheduled". */
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    /**
     * Optional picture, kept under a story-owned storage key (never business
     * media). The description is required whenever a picture is present.
     */
    imageKey: text("image_key"),
    imageContentType: text("image_content_type"),
    imageAlt: text("image_alt"),
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
    index("local_story_due_idx")
      .on(table.scheduledFor)
      .where(sql`${table.status} = 'scheduled'`),
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
      sql`${table.imageKey} is null or (${table.imageContentType} is not null and length(trim(coalesce(${table.imageAlt}, ''))) >= 3)`,
    ),
  ],
);
