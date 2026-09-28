import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { business } from "./business";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/**
 * Self-declared, per-business accessibility and service attributes (OV-303).
 * One row per business, upserted as a whole from the dashboard attributes
 * form. All flags default to false so an absent row is equivalent to "no
 * attributes declared" for both public display and search filtering.
 */
export const businessAttributes = pgTable(
  "business_attributes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    stepFreeAccess: boolean("step_free_access").notNull().default(false),
    accessibleToilet: boolean("accessible_toilet").notNull().default(false),
    hearingLoop: boolean("hearing_loop").notNull().default(false),
    welshSpeaking: boolean("welsh_speaking").notNull().default(false),
    deliveryAvailable: boolean("delivery_available").notNull().default(false),
    collectionAvailable: boolean("collection_available")
      .notNull()
      .default(false),
    emergencyAvailable: boolean("emergency_available").notNull().default(false),
    appointmentRequired: boolean("appointment_required")
      .notNull()
      .default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_attributes_business_unique").on(table.businessId),
  ],
);
