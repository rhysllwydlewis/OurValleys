import { index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { business } from "./business";
import { businessEvent } from "./business-operations";

export const savedBusiness = pgTable(
  "resident_saved_business",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.businessId] }),
    index("resident_saved_business_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const savedEvent = pgTable(
  "resident_saved_event",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => businessEvent.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.eventId] }),
    index("resident_saved_event_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
