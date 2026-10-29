import {
  boolean,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { business, place } from "./business";
import { businessEvent, businessOffer } from "./business-operations";

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
    /** In-site notices for this business's new updates, offers and events. */
    notify: boolean("notify").notNull().default(true),
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
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.eventId] }),
    index("resident_saved_event_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const savedOffer = pgTable(
  "resident_saved_offer",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => businessOffer.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /**
     * The end time the in-site "ends soon" notice was last raised for. An
     * offer whose end is moved later is therefore flagged again near its new end.
     */
    endingNoticeAt: timestamp("ending_notice_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.offerId] }),
    index("resident_saved_offer_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    // The ending-soon scan joins from the offer side.
    index("resident_saved_offer_offer_idx").on(table.offerId),
  ],
);

export const savedPlace = pgTable(
  "resident_saved_place",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    placeId: uuid("place_id")
      .notNull()
      .references(() => place.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.placeId] }),
    index("resident_saved_place_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
