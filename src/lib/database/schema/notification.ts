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
import { sql } from "drizzle-orm";
import { user } from "./auth";

/**
 * An in-site notification for one signed-in person. Private to that person.
 * The row stores a kind and small plain-text parameters, never finished
 * English, so the inbox renders it in the reader's language. `dedupe_key`
 * makes raising the same notification twice a no-op.
 */
export const notification = pgTable(
  "account_notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** Plain-text values the message template fills in (names, counts). */
    params: jsonb("params")
      .$type<Record<string, string | number>>()
      .notNull()
      .default({}),
    /** Site-relative path the notification opens; null for none. */
    href: text("href"),
    dedupeKey: text("dedupe_key"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("account_notification_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("account_notification_user_unread_idx")
      .on(table.userId)
      .where(sql`${table.readAt} is null`),
    uniqueIndex("account_notification_user_dedupe_idx")
      .on(table.userId, table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null`),
    check(
      "account_notification_kind_check",
      sql`${table.kind} in ('saved_search_results', 'event_reminder', 'place_digest', 'owner_digest')`,
    ),
    check(
      "account_notification_href_check",
      sql`${table.href} is null or (${table.href} like '/%' and ${table.href} not like '//%' and char_length(${table.href}) <= 300)`,
    ),
    check(
      "account_notification_dedupe_check",
      sql`${table.dedupeKey} is null or char_length(${table.dedupeKey}) <= 200`,
    ),
  ],
);
