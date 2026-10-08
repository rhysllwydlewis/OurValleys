import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
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

export const businessContactMethod = pgTable(
  "business_contact_method",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    label: text("label").notNull(),
    value: text("value").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    consentNote: text("consent_note"),
    ...timestamps,
  },
  (table) => [
    index("business_contact_method_business_idx").on(
      table.businessId,
      table.enabled,
      table.sortOrder,
    ),
    uniqueIndex("business_contact_method_one_primary_unique")
      .on(table.businessId)
      .where(sql`${table.enabled} = true and ${table.isPrimary} = true`),
    check(
      "business_contact_method_type_check",
      sql`${table.type} in ('call', 'email', 'enquiry', 'quote', 'callback', 'booking', 'whatsapp', 'directions', 'website', 'order')`,
    ),
  ],
);

export const businessEnquiry = pgTable(
  "business_enquiry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("enquiry"),
    senderName: text("sender_name").notNull(),
    senderEmail: text("sender_email"),
    senderPhone: text("sender_phone"),
    message: text("message").notNull(),
    preferredTime: text("preferred_time"),
    consentAccepted: boolean("consent_accepted").notNull().default(false),
    status: text("status").notNull().default("new"),
    source: text("source").notNull().default("business_website"),
    visitorHash: text("visitor_hash"),
    dedupeKey: text("dedupe_key").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    retentionExpiresAt: timestamp("retention_expires_at", {
      withTimezone: true,
    }),
    firstRepliedAt: timestamp("first_replied_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("business_enquiry_dedupe_unique").on(table.dedupeKey),
    index("business_enquiry_business_status_idx").on(
      table.businessId,
      table.status,
      table.submittedAt,
    ),
    index("business_enquiry_rate_limit_idx").on(
      table.businessId,
      table.visitorHash,
      table.submittedAt,
    ),
    index("business_enquiry_retention_idx").on(table.retentionExpiresAt),
    check(
      "business_enquiry_kind_check",
      sql`${table.kind} in ('enquiry', 'quote', 'callback')`,
    ),
    check(
      "business_enquiry_status_check",
      sql`${table.status} in ('new', 'read', 'replied', 'closed', 'archived', 'spam')`,
    ),
  ],
);

export const businessTicket = pgTable(
  "business_ticket",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    relatedBusinessId: uuid("related_business_id").references(
      () => business.id,
      { onDelete: "set null" },
    ),
    reporterUserId: uuid("reporter_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reporterEmail: text("reporter_email"),
    type: text("type").notNull(),
    reason: text("reason").notNull(),
    evidence: jsonb("evidence"),
    riskLevel: text("risk_level").notNull().default("standard"),
    status: text("status").notNull().default("open"),
    resolutionAction: text("resolution_action"),
    resolutionNote: text("resolution_note"),
    assignedToUserId: uuid("assigned_to_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("business_ticket_status_idx").on(table.status, table.createdAt),
    index("business_ticket_business_idx").on(table.businessId, table.status),
    check(
      "business_ticket_type_check",
      sql`${table.type} in ('claim', 'duplicate', 'correction', 'slug_change')`,
    ),
    check(
      "business_ticket_risk_check",
      sql`${table.riskLevel} in ('standard', 'high')`,
    ),
    check(
      "business_ticket_status_check",
      sql`${table.status} in ('open', 'awaiting_information', 'approved', 'rejected', 'resolved', 'dismissed')`,
    ),
  ],
);

export const businessTicketEvent = pgTable(
  "business_ticket_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => businessTicket.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    note: text("note"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("business_ticket_event_ticket_idx").on(table.ticketId)],
);

export const businessOffer = pgTable(
  "business_offer",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    terms: text("terms"),
    actionLabel: text("action_label"),
    actionUrl: text("action_url"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: text("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("business_offer_business_idx").on(
      table.businessId,
      table.status,
      table.endsAt,
    ),
    check(
      "business_offer_status_check",
      sql`${table.status} in ('draft', 'active', 'hidden')`,
    ),
  ],
);

export const businessEvent = pgTable(
  "business_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    locationDisplay: text("location_display"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    bookingUrl: text("booking_url"),
    status: text("status").notNull().default("draft"),
    /** Shared by the rows materialised from one repeating event. */
    seriesId: uuid("series_id"),
    ...timestamps,
  },
  (table) => [
    index("business_event_series_idx").on(table.seriesId),
    index("business_event_public_idx").on(
      table.status,
      table.startsAt,
      table.endsAt,
    ),
    index("business_event_business_idx").on(table.businessId, table.startsAt),
    check(
      "business_event_status_check",
      sql`${table.status} in ('draft', 'active', 'cancelled', 'hidden', 'removed')`,
    ),
  ],
);

export const businessMenuGroup = pgTable(
  "business_menu_group",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    index("business_menu_group_business_idx").on(
      table.businessId,
      table.sortOrder,
    ),
    check(
      "business_menu_group_status_check",
      sql`${table.status} in ('active', 'hidden')`,
    ),
  ],
);

export const businessMenuItem = pgTable(
  "business_menu_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => businessMenuGroup.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceDisplay: text("price_display"),
    dietaryLabels: text("dietary_labels").array().notNull().default([]),
    available: boolean("available").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("business_menu_item_group_idx").on(table.groupId, table.sortOrder),
    index("business_menu_item_business_idx").on(table.businessId),
  ],
);

export const businessCategorySection = pgTable(
  "business_category_section",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    sectionType: text("section_type").notNull(),
    title: text("title").notNull(),
    content: jsonb("content").notNull(),
    status: text("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("business_category_section_business_idx").on(
      table.businessId,
      table.status,
      table.sortOrder,
    ),
    check(
      "business_category_section_type_check",
      sql`${table.sectionType} in ('areas_covered', 'treatments', 'facilities', 'products', 'team', 'faq')`,
    ),
    check(
      "business_category_section_status_check",
      sql`${table.status} in ('active', 'hidden')`,
    ),
  ],
);

export const businessDocument = pgTable(
  "business_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("menu"),
    storageKey: text("storage_key").notNull(),
    displayName: text("display_name").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_document_storage_key_unique").on(table.storageKey),
    uniqueIndex("business_document_one_active_role_unique")
      .on(table.businessId, table.role)
      .where(sql`${table.status} = 'active'`),
    check("business_document_role_check", sql`${table.role} in ('menu')`),
    check(
      "business_document_status_check",
      sql`${table.status} in ('active', 'replaced', 'removed')`,
    ),
    check("business_document_byte_size_check", sql`${table.byteSize} > 0`),
  ],
);

export const businessLifecycle = pgTable(
  "business_lifecycle",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    state: text("state").notNull().default("active"),
    autoPublishEnabled: boolean("auto_publish_enabled")
      .notNull()
      .default(false),
    autoPublishAt: timestamp("auto_publish_at", { withTimezone: true }),
    lifecycleEmailsEnabled: boolean("lifecycle_emails_enabled")
      .notNull()
      .default(true),
    postponedUntil: timestamp("postponed_until", { withTimezone: true }),
    dayTwoReminderSentAt: timestamp("day_two_reminder_sent_at", {
      withTimezone: true,
    }),
    daySevenReminderSentAt: timestamp("day_seven_reminder_sent_at", {
      withTimezone: true,
    }),
    prePublishReminderSentAt: timestamp("pre_publish_reminder_sent_at", {
      withTimezone: true,
    }),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
    nextConfirmationDueAt: timestamp("next_confirmation_due_at", {
      withTimezone: true,
    }),
    staleAt: timestamp("stale_at", { withTimezone: true }),
    detailsCheckReminderSentAt: timestamp("details_check_reminder_sent_at", {
      withTimezone: true,
    }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    temporaryClosedUntil: timestamp("temporary_closed_until", {
      withTimezone: true,
    }),
    permanentlyClosedAt: timestamp("permanently_closed_at", {
      withTimezone: true,
    }),
    deletionRequestedAt: timestamp("deletion_requested_at", {
      withTimezone: true,
    }),
    deletionWarningSentAt: timestamp("deletion_warning_sent_at", {
      withTimezone: true,
    }),
    deleteAfter: timestamp("delete_after", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_lifecycle_business_unique").on(table.businessId),
    index("business_lifecycle_automation_idx").on(
      table.autoPublishEnabled,
      table.autoPublishAt,
      table.nextConfirmationDueAt,
    ),
    check(
      "business_lifecycle_state_check",
      sql`${table.state} in ('active', 'paused', 'temporarily_closed', 'permanently_closed', 'deletion_pending')`,
    ),
  ],
);

export const businessActivityEvent = pgTable(
  "business_activity_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    source: text("source").notNull().default("direct"),
    visitorHash: text("visitor_hash"),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("business_activity_business_time_idx").on(
      table.businessId,
      table.occurredAt,
    ),
    index("business_activity_type_time_idx").on(
      table.eventType,
      table.occurredAt,
    ),
    check(
      "business_activity_event_type_check",
      sql`${table.eventType} in ('website_view', 'search_appearance', 'call_click', 'email_click', 'enquiry', 'directions_click', 'external_click', 'booking_click', 'order_click', 'qr_visit')`,
    ),
  ],
);

export const businessEntitlement = pgTable(
  "business_entitlement",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    planKey: text("plan_key").notNull().default("free"),
    capabilities: text("capabilities").array().notNull().default([]),
    limits: jsonb("limits").notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_entitlement_business_unique").on(table.businessId),
    check(
      "business_entitlement_plan_check",
      sql`${table.planKey} in ('free', 'custom')`,
    ),
  ],
);

export const businessSlugRedirect = pgTable(
  "business_slug_redirect",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    fromSlug: text("from_slug").notNull(),
    toSlug: text("to_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_slug_redirect_from_unique").on(table.fromSlug),
    index("business_slug_redirect_business_idx").on(table.businessId),
  ],
);

/**
 * Directory searches that returned no businesses (OV-706 zero-result
 * analytics). Deliberately carries no user, session or visitor identifier:
 * only the normalised search text and the filters that were applied, so it
 * can show where demand outruns coverage without profiling anyone.
 */
export const searchZeroResult = pgTable(
  "search_zero_result",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    queryText: text("query_text"),
    categorySlug: text("category_slug"),
    placeSlug: text("place_slug"),
    filterCount: integer("filter_count").notNull().default(0),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("search_zero_result_time_idx").on(table.occurredAt),
    check(
      "search_zero_result_query_length_check",
      sql`${table.queryText} is null or char_length(${table.queryText}) <= 80`,
    ),
    check(
      "search_zero_result_filter_count_check",
      sql`${table.filterCount} >= 0`,
    ),
  ],
);

/**
 * Resident suggestions for local businesses that are not yet listed (issue
 * #313). Private, admin-only leads: nothing here is published or turned into a
 * business automatically. The optional contact email belongs to the resident,
 * not the business, and is removed by the retention job after twelve months.
 */
export const businessSuggestion = pgTable(
  "business_suggestion",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    placeText: text("place_text").notNull(),
    categoryText: text("category_text"),
    note: text("note"),
    contactEmail: text("contact_email"),
    /** Lower-cased name and place with punctuation removed, to group repeats. */
    dedupeKey: text("dedupe_key").notNull(),
    status: text("status").notNull().default("new"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("business_suggestion_status_time_idx").on(
      table.status,
      table.createdAt,
    ),
    index("business_suggestion_dedupe_idx").on(table.dedupeKey),
    check(
      "business_suggestion_status_check",
      sql`${table.status} in ('new', 'seeded', 'already_listed', 'rejected')`,
    ),
    check(
      "business_suggestion_length_check",
      sql`char_length(${table.name}) between 2 and 120
        and char_length(${table.placeText}) between 2 and 80
        and (${table.categoryText} is null or char_length(${table.categoryText}) <= 80)
        and (${table.note} is null or char_length(${table.note}) <= 500)
        and (${table.contactEmail} is null or char_length(${table.contactEmail}) <= 254)`,
    ),
  ],
);

/**
 * Outcome of each provider-bound transactional email (issue #257). Holds no
 * recipient address, subject or body: only the coarse category, delivery mode
 * and a short provider error, so a founder can see that sending is failing
 * without the log becoming a second copy of personal data.
 */
export const emailDeliveryLog = pgTable(
  "email_delivery_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: text("category").notNull(),
    mode: text("mode").notNull(),
    status: text("status").notNull(),
    error: text("error"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("email_delivery_log_time_idx").on(table.occurredAt),
    check(
      "email_delivery_log_status_check",
      sql`${table.status} in ('sent', 'failed')`,
    ),
    check(
      "email_delivery_log_error_length_check",
      sql`${table.error} is null or char_length(${table.error}) <= 200`,
    ),
  ],
);
