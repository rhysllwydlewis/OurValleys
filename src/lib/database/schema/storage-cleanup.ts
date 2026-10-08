import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Storage objects waiting to be deleted. A row is written in the same
 * transaction as the change that orphans the object (a picture retired, a
 * document replaced, a business deleted). It deliberately has no foreign key:
 * deleting a business cascades its media rows away, and this queue must
 * outlive them so the files can still be removed.
 */
export const storageCleanup = pgTable(
  "storage_cleanup",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storageKey: text("storage_key").notNull(),
    queuedAt: timestamp("queued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("storage_cleanup_storage_key_unique").on(table.storageKey),
    index("storage_cleanup_pending_idx").on(table.deletedAt, table.queuedAt),
  ],
);
