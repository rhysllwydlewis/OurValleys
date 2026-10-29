import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { business } from "./business";
import {
  businessEvent,
  businessOffer,
  businessUpdate,
} from "./business-operations";
import { businessReview } from "./business-reviews";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const contentReport = pgTable(
  "content_report",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id").references(() => business.id, {
      onDelete: "cascade",
    }),
    reviewId: uuid("review_id").references(() => businessReview.id, {
      onDelete: "cascade",
    }),
    eventId: uuid("event_id").references(() => businessEvent.id, {
      onDelete: "cascade",
    }),
    offerId: uuid("offer_id").references(() => businessOffer.id, {
      onDelete: "cascade",
    }),
    updateId: uuid("update_id").references(() => businessUpdate.id, {
      onDelete: "cascade",
    }),
    reporterUserId: uuid("reporter_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reporterEmail: text("reporter_email"),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("open"),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("content_report_business_idx").on(table.businessId, table.status),
    index("content_report_review_idx").on(table.reviewId, table.status),
    index("content_report_event_idx").on(table.eventId, table.status),
    index("content_report_offer_idx").on(table.offerId, table.status),
    index("content_report_update_idx").on(table.updateId, table.status),
    index("content_report_status_idx").on(table.status, table.createdAt),
    check(
      "content_report_single_target_check",
      sql`(
        (case when ${table.businessId} is not null then 1 else 0 end) +
        (case when ${table.reviewId} is not null then 1 else 0 end) +
        (case when ${table.eventId} is not null then 1 else 0 end) +
        (case when ${table.offerId} is not null then 1 else 0 end) +
        (case when ${table.updateId} is not null then 1 else 0 end)
      ) = 1`,
    ),
  ],
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_audit_log_created_idx").on(table.createdAt),
    index("admin_audit_log_actor_idx").on(table.actorUserId),
  ],
);
