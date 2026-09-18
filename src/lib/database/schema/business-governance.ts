import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
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
    uniqueIndex("business_terms_acceptance_business_unique").on(
      table.businessId,
    ),
  ],
);

export const businessInvitation = pgTable(
  "business_invitation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    token: text("token").notNull(),
    status: text("status").notNull().default("pending"),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_invitation_token_unique").on(table.token),
    uniqueIndex("business_invitation_business_email_pending_unique")
      .on(table.businessId, table.email)
      .where(sql`${table.status} = 'pending'`),
    index("business_invitation_business_status_idx").on(
      table.businessId,
      table.status,
    ),
    check(
      "business_invitation_role_check",
      sql`${table.role} in ('manager', 'editor', 'viewer')`,
    ),
    check(
      "business_invitation_status_check",
      sql`${table.status} in ('pending', 'accepted', 'revoked', 'expired')`,
    ),
  ],
);
