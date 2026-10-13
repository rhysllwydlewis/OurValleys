import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

/**
 * Account-level preferences a resident chose themselves. Kept apart from
 * `auth_user` so preference work never touches the authentication tables.
 */
export const residentPreference = pgTable(
  "resident_preference",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    /** The interface language the resident picked: "en" or "cy". */
    locale: text("locale").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "resident_preference_locale_check",
      sql`${table.locale} in ('en', 'cy')`,
    ),
  ],
);
