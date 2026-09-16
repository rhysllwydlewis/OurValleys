import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { business } from "./business";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const businessReview = pgTable(
  "business_review",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body"),
    status: text("status").notNull().default("published"),
    hiddenByUserId: uuid("hidden_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    hiddenReason: text("hidden_reason"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_review_business_user_unique").on(
      table.businessId,
      table.userId,
    ),
    index("business_review_business_status_idx").on(
      table.businessId,
      table.status,
      table.createdAt,
    ),
    check(
      "business_review_rating_range_check",
      sql`${table.rating} between 1 and 5`,
    ),
    check(
      "business_review_status_check",
      sql`${table.status} in ('published', 'hidden')`,
    ),
  ],
);
