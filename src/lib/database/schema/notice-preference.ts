import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * A kind of in-site notice one person chose not to receive. Absence of a row
 * means the notice is on, so new kinds default to on and a person who never
 * opens their preferences keeps today's behaviour. Private to that person.
 */
export const noticeMute = pgTable(
  "resident_notice_mute",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "resident_notice_mute_pk",
      columns: [table.userId, table.kind],
    }),
    check(
      "resident_notice_mute_kind_check",
      sql`${table.kind} in ('saved_search_results', 'event_reminder', 'place_digest', 'owner_digest', 'followed_update', 'followed_offer', 'followed_event', 'saved_offer_ending')`,
    ),
  ],
);
