import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

/**
 * A search a resident chose to keep. Private to the resident. The baseline
 * (`last_seen_total`) is the number of results the resident last looked at,
 * so the saved list can say how many more there are now.
 */
export const savedSearch = pgTable(
  "resident_saved_search",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** The query as typed (trimmed, at most 80 characters); for "directory", the canonical filter query string (at most 200). */
    query: text("query").notNull(),
    /** Case- and accent-folded query: the identity of the search. */
    queryKey: text("query_key").notNull(),
    /** The result type the resident was looking at ("all", one type, or the "directory" filter set). */
    type: text("type").notNull().default("all"),
    lastSeenTotal: integer("last_seen_total").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Opt-in: email the resident when results beyond the baseline appear. */
    emailAlerts: boolean("email_alerts").notNull().default(false),
    /** The result count the last alert email covered; null until one is sent. */
    alertedTotal: integer("alerted_total"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("resident_saved_search_user_key_type_idx").on(
      table.userId,
      table.queryKey,
      table.type,
    ),
    index("resident_saved_search_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    check(
      "resident_saved_search_type_check",
      sql`${table.type} in ('all', 'businesses', 'offers', 'events', 'places', 'categories', 'guides', 'directory')`,
    ),
    check(
      "resident_saved_search_query_check",
      sql`(${table.type} = 'directory' and char_length(${table.query}) between 1 and 200 and char_length(${table.queryKey}) between 1 and 200) or (${table.type} <> 'directory' and char_length(${table.query}) between 2 and 80 and char_length(${table.queryKey}) between 2 and 80)`,
    ),
    check(
      "resident_saved_search_total_check",
      sql`${table.lastSeenTotal} >= 0`,
    ),
    check(
      "resident_saved_search_alerted_total_check",
      sql`${table.alertedTotal} is null or ${table.alertedTotal} >= 0`,
    ),
  ],
);
