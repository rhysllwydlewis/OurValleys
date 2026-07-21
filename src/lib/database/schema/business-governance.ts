import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { business } from "./business";

export const businessTermsAcceptance = pgTable(
  "business_terms_acceptance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    acceptedByUserId: uuid("accepted_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    termsVersion: text("terms_version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_terms_acceptance_business_unique").on(table.businessId),
  ],
);
