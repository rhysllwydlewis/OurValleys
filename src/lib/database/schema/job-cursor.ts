import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Where a scheduled scan stopped, so the next run covers exactly the time
 * since and a missed run is caught up rather than skipped. One row per job.
 */
export const jobCursor = pgTable("job_cursor", {
  name: text("name").primaryKey(),
  cursorAt: timestamp("cursor_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
