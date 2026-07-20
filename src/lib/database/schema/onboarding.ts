import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { business } from "./business";

export const businessOnboardingDraft = pgTable(
  "business_onboarding_draft",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(0),
    profile: jsonb("profile"),
    location: jsonb("location"),
    services: jsonb("services"),
    hours: jsonb("hours"),
    exceptionalHours: jsonb("exceptional_hours"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_onboarding_draft_business_unique").on(
      table.businessId,
    ),
    index("business_onboarding_draft_updated_idx").on(table.updatedAt),
  ],
);
