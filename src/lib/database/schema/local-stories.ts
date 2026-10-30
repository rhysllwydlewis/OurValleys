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
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
  ],
);
