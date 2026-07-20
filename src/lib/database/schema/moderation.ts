import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
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

export const contentReport = pgTable(
  "content_report",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
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
    index("content_report_status_idx").on(table.status, table.createdAt),
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
