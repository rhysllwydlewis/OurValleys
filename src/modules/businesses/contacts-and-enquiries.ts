import "server-only";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { business, businessMembership } from "@/lib/database/schema/business";
import {
  businessContactMethod,
  businessEnquiry,
} from "@/lib/database/schema/business-operations";
import { user } from "@/lib/database/schema/auth";
import { sendTransactionalEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site";
import { recordBusinessActivity } from "./analytics";
import { hasBusinessCapability } from "./entitlements";

export const contactMethodTypes = [
  "call",
  "email",
  "enquiry",
  "quote",
  "callback",
  "booking",
  "whatsapp",
  "directions",
  "website",
  "order",
] as const;

export type ContactMethodType = (typeof contactMethodTypes)[number];
export type EnquiryKind = "enquiry" | "quote" | "callback";
export const enquiryStatuses = [
  "new",
  "read",
  "replied",
  "closed",
  "archived",
  "spam",
] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];

const phonePattern = /^[+()\d\s.-]{7,30}$/;
const contactMethodSchema = z.object({
  id: z.uuid().optional(),
  type: z.enum(contactMethodTypes),
  label: z.string().trim().min(2).max(50),
  value: z.string().trim().max(500),
  enabled: z.boolean(),
  isPrimary: z.boolean(),
  sortOrder: z.number().int().min(0).max(50),
  consentNote: z.string().trim().max(300).nullable().optional(),
});

const enquirySchema = z
  .object({
    businessId: z.uuid(),
    kind: z.enum(["enquiry", "quote", "callback"]),
    senderName: z.string().trim().min(2).max(100),
    senderEmail: z.union([z.email().max(254), z.literal("")]).optional(),
    senderPhone: z.string().trim().max(30).optional(),
    message: z.string().trim().min(10).max(2000),
    preferredTime: z.string().trim().max(120).optional(),
    consentAccepted: z.literal(true),
    website: z.string().max(0).optional(),
  })
  .superRefine((value, context) => {
    if (!value.senderEmail && !value.senderPhone) {
      context.addIssue({
        code: "custom",
        message:
          "Add an email address or telephone number so the business can reply.",
        path: ["senderEmail"],
      });
    }
    if (value.senderPhone && !phonePattern.test(value.senderPhone)) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid telephone number.",
        path: ["senderPhone"],
      });
    }
  });

export type BusinessContactMethodView = {
  id: string;
  type: ContactMethodType;
  label: string;
  value: string;
  enabled: boolean;
  isPrimary: boolean;
  sortOrder: number;
  consentNote: string | null;
};

export type PublicContactAction = {
  id: string;
  type: ContactMethodType;
  label: string;
  href: string | null;
  formKind: EnquiryKind | null;
  isPrimary: boolean;
};

function isContactMethodType(value: string): value is ContactMethodType {
  return (contactMethodTypes as readonly string[]).includes(value);
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateContactValue(type: ContactMethodType, value: string): boolean {
  switch (type) {
    case "call":
    case "whatsapp":
      return phonePattern.test(value);
    case "email":
      return z.email().safeParse(value).success;
    case "booking":
    case "website":
    case "order":
      return isSafeHttpUrl(value);
    case "directions":
      if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return isSafeHttpUrl(value);
      return value.length >= 3;
    case "enquiry":
    case "quote":
    case "callback":
      return value === "form" || value === "enabled";
  }
}

function normalisePhone(value: string): string {
  return value.replace(/[^+\d]/g, "");
}

export function contactMethodToAction(
  method: BusinessContactMethodView,
): PublicContactAction | null {
  if (!method.enabled || !validateContactValue(method.type, method.value))
    return null;

  switch (method.type) {
    case "call":
      return {
        ...method,
        href: `tel:${normalisePhone(method.value)}`,
        formKind: null,
      };
    case "email":
      return { ...method, href: `mailto:${method.value}`, formKind: null };
    case "whatsapp":
      return {
        ...method,
        href: `https://wa.me/${normalisePhone(method.value).replace(/^\+/, "")}`,
        formKind: null,
      };
    case "directions":
      return {
        ...method,
        href: isSafeHttpUrl(method.value)
          ? method.value
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(method.value)}`,
        formKind: null,
      };
    case "booking":
    case "website":
    case "order":
      return { ...method, href: method.value, formKind: null };
    case "enquiry":
    case "quote":
    case "callback":
      return { ...method, href: null, formKind: method.type };
  }
}

export async function listBusinessContactMethods(
  businessId: string,
): Promise<BusinessContactMethodView[]> {
  try {
    const database = getDatabase();
    const rows = await database
      .select()
      .from(businessContactMethod)
      .where(eq(businessContactMethod.businessId, businessId))
      .orderBy(
        asc(businessContactMethod.sortOrder),
        asc(businessContactMethod.createdAt),
      );

    return rows
      .filter((row) => isContactMethodType(row.type))
      .map((row) => ({
        id: row.id,
        type: row.type as ContactMethodType,
        label: row.label,
        value: row.value,
        enabled: row.enabled,
        isPrimary: row.isPrimary,
        sortOrder: row.sortOrder,
        consentNote: row.consentNote,
      }));
  } catch {
    return [];
  }
}

export async function listPublicContactActions(
  businessId: string,
): Promise<PublicContactAction[]> {
  if (!(await hasBusinessCapability(businessId, "contacts"))) return [];

  const configured = (await listBusinessContactMethods(businessId))
    .map(contactMethodToAction)
    .filter((value): value is PublicContactAction => Boolean(value));
  if (configured.length > 0) {
    return configured.sort(
      (left, right) =>
        Number(right.isPrimary) - Number(left.isPrimary) ||
        left.label.localeCompare(right.label),
    );
  }

  // Preserve useful contact actions for businesses published before Phase 7.
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        publicPhone: business.publicPhone,
        publicEmail: business.publicEmail,
      })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);
    if (!row) return [];
    const fallback: PublicContactAction[] = [];
    if (row.publicEmail) {
      fallback.push({
        id: "legacy-email",
        type: "email",
        label: "Email us",
        href: `mailto:${row.publicEmail}`,
        formKind: null,
        isPrimary: true,
      });
    }
    if (row.publicPhone) {
      fallback.push({
        id: "legacy-phone",
        type: "call",
        label: "Call us",
        href: `tel:${normalisePhone(row.publicPhone)}`,
        formKind: null,
        isPrimary: fallback.length === 0,
      });
    }
    return fallback;
  } catch {
    return [];
  }
}

export type SaveContactMethodResult =
  | { status: "saved"; id: string }
  | { status: "invalid"; message: string }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function saveBusinessContactMethod(input: {
  businessId: string;
  method: z.input<typeof contactMethodSchema>;
}): Promise<SaveContactMethodResult> {
  const parsed = contactMethodSchema.safeParse(input.method);
  if (!parsed.success) {
    return {
      status: "invalid",
      message: "Check the contact method and try again.",
    };
  }
  if (!validateContactValue(parsed.data.type, parsed.data.value)) {
    return {
      status: "invalid",
      message: "That contact value does not match the selected contact method.",
    };
  }

  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:contacts`}))`,
      );
      const [businessRow] = await transaction
        .select({ id: business.id })
        .from(business)
        .where(eq(business.id, input.businessId))
        .limit(1);
      if (!businessRow) return { status: "not_found" } as const;

      if (parsed.data.id) {
        const [existing] = await transaction
          .select({ id: businessContactMethod.id })
          .from(businessContactMethod)
          .where(
            and(
              eq(businessContactMethod.id, parsed.data.id),
              eq(businessContactMethod.businessId, input.businessId),
            ),
          )
          .for("update")
          .limit(1);
        if (!existing) return { status: "not_found" } as const;
      }

      if (parsed.data.enabled && parsed.data.isPrimary) {
        await transaction
          .update(businessContactMethod)
          .set({ isPrimary: false, updatedAt: sql`now()` })
          .where(eq(businessContactMethod.businessId, input.businessId));
      }

      if (parsed.data.id) {
        const [updated] = await transaction
          .update(businessContactMethod)
          .set({
            type: parsed.data.type,
            label: parsed.data.label,
            value: parsed.data.value,
            enabled: parsed.data.enabled,
            isPrimary: parsed.data.enabled && parsed.data.isPrimary,
            sortOrder: parsed.data.sortOrder,
            consentNote: parsed.data.consentNote ?? null,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(businessContactMethod.id, parsed.data.id),
              eq(businessContactMethod.businessId, input.businessId),
            ),
          )
          .returning({ id: businessContactMethod.id });
        if (!updated) return { status: "not_found" } as const;
        return { status: "saved", id: updated.id } as const;
      }

      const [created] = await transaction
        .insert(businessContactMethod)
        .values({
          businessId: input.businessId,
          type: parsed.data.type,
          label: parsed.data.label,
          value: parsed.data.value,
          enabled: parsed.data.enabled,
          isPrimary: parsed.data.enabled && parsed.data.isPrimary,
          sortOrder: parsed.data.sortOrder,
          consentNote: parsed.data.consentNote ?? null,
        })
        .returning({ id: businessContactMethod.id });
      if (!created) return { status: "unavailable" } as const;
      return { status: "saved", id: created.id } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}

export async function removeBusinessContactMethod(input: {
  businessId: string;
  methodId: string;
}): Promise<"removed" | "not_found" | "unavailable"> {
  try {
    const database = getDatabase();
    const removed = await database
      .delete(businessContactMethod)
      .where(
        and(
          eq(businessContactMethod.id, input.methodId),
          eq(businessContactMethod.businessId, input.businessId),
        ),
      )
      .returning({ id: businessContactMethod.id });
    return removed.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

function createDedupeKey(input: {
  businessId: string;
  kind: string;
  senderEmail?: string;
  senderPhone?: string;
  message: string;
}): string {
  const fiveMinuteBucket = Math.floor(Date.now() / (5 * 60 * 1000));
  return createHash("sha256")
    .update(
      [
        input.businessId,
        input.kind,
        input.senderEmail?.toLowerCase() ?? "",
        input.senderPhone ?? "",
        input.message,
        fiveMinuteBucket,
      ].join("|"),
    )
    .digest("hex");
}

export type SubmitEnquiryResult =
  | { status: "submitted" }
  | { status: "invalid"; message: string }
  | { status: "rate_limited" }
  | { status: "duplicate" }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function submitBusinessEnquiry(
  input: unknown & {
    visitorHash?: string | null;
  },
): Promise<SubmitEnquiryResult> {
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      message:
        parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }
  if (parsed.data.website) return { status: "submitted" };
  if (!(await hasBusinessCapability(parsed.data.businessId, "enquiries"))) {
    return { status: "not_found" };
  }

  const visitorHash =
    typeof input === "object" && input && "visitorHash" in input
      ? (input.visitorHash ?? null)
      : null;

  try {
    const database = getDatabase();
    const [businessRow] = await database
      .select({ id: business.id, tradingName: business.tradingName })
      .from(business)
      .where(
        and(
          eq(business.id, parsed.data.businessId),
          eq(business.status, "published"),
        ),
      )
      .limit(1);
    if (!businessRow) return { status: "not_found" };

    if (visitorHash) {
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const [rate] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(businessEnquiry)
        .where(
          and(
            eq(businessEnquiry.businessId, parsed.data.businessId),
            eq(businessEnquiry.visitorHash, visitorHash),
            gte(businessEnquiry.submittedAt, since),
          ),
        );
      if ((rate?.count ?? 0) >= 5) return { status: "rate_limited" };
    }

    const dedupeKey = createDedupeKey(parsed.data);
    const [existing] = await database
      .select({ id: businessEnquiry.id })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.dedupeKey, dedupeKey))
      .limit(1);
    if (existing) return { status: "duplicate" };

    await database.insert(businessEnquiry).values({
      businessId: parsed.data.businessId,
      kind: parsed.data.kind,
      senderName: parsed.data.senderName,
      senderEmail: parsed.data.senderEmail || null,
      senderPhone: parsed.data.senderPhone || null,
      message: parsed.data.message,
      preferredTime: parsed.data.preferredTime || null,
      consentAccepted: true,
      visitorHash,
      dedupeKey,
    });

    await recordBusinessActivity({
      businessId: parsed.data.businessId,
      eventType: "enquiry",
      source: "business_website",
      visitorHash,
      metadata: { kind: parsed.data.kind },
    });

    const recipients = await database
      .select({ email: user.email })
      .from(businessMembership)
      .innerJoin(user, eq(user.id, businessMembership.userId))
      .where(
        and(
          eq(businessMembership.businessId, parsed.data.businessId),
          eq(businessMembership.status, "active"),
          inArray(businessMembership.role, ["owner", "manager"]),
        ),
      );
    const dashboardUrl = new URL(
      `/dashboard/business/${parsed.data.businessId}/operations#inbox`,
      getSiteUrl(),
    ).toString();
    await Promise.allSettled(
      [...new Set(recipients.map((recipient) => recipient.email))].map(
        (email) =>
          sendTransactionalEmail({
            to: email,
            subject: `New ${parsed.data.kind.replace("_", " ")} for ${businessRow.tradingName}`,
            text: [
              `${parsed.data.senderName} sent a new ${parsed.data.kind}.`,
              "",
              parsed.data.message.slice(0, 500),
              "",
              `Open the protected business inbox: ${dashboardUrl}`,
              "",
              "The sender's private contact details are available only in the protected inbox.",
            ].join("\n"),
          }),
      ),
    );

    return { status: "submitted" };
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    ) {
      return { status: "duplicate" };
    }
    return { status: "unavailable" };
  }
}

export type BusinessEnquiryView = {
  id: string;
  kind: EnquiryKind;
  senderName: string;
  senderEmail: string | null;
  senderPhone: string | null;
  message: string;
  preferredTime: string | null;
  status: EnquiryStatus;
  submittedAt: Date;
};

const enquiryKinds: readonly string[] = ["enquiry", "quote", "callback"];

function toEnquiryView(row: typeof businessEnquiry.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind as EnquiryKind,
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    senderPhone: row.senderPhone,
    message: row.message,
    preferredTime: row.preferredTime,
    status: row.status as EnquiryStatus,
    submittedAt: row.submittedAt,
  };
}

export async function listBusinessEnquiries(
  businessId: string,
  status?: EnquiryStatus,
  limit = 200,
): Promise<BusinessEnquiryView[]> {
  try {
    const database = getDatabase();
    const filters = [eq(businessEnquiry.businessId, businessId)];
    if (status) filters.push(eq(businessEnquiry.status, status));
    const rows = await database
      .select()
      .from(businessEnquiry)
      .where(and(...filters))
      .orderBy(desc(businessEnquiry.submittedAt))
      .limit(limit);
    return rows
      .filter(
        (row) =>
          enquiryKinds.includes(row.kind) &&
          (enquiryStatuses as readonly string[]).includes(row.status),
      )
      .map(toEnquiryView);
  } catch {
    return [];
  }
}

export const ENQUIRY_INBOX_PAGE_SIZE = 20;

export type BusinessEnquiryPage = {
  enquiries: BusinessEnquiryView[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

export async function listBusinessEnquiriesPage(
  businessId: string,
  options: { status?: EnquiryStatus; page?: number } = {},
): Promise<BusinessEnquiryPage> {
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const pageSize = ENQUIRY_INBOX_PAGE_SIZE;
  try {
    const database = getDatabase();
    const filters = [eq(businessEnquiry.businessId, businessId)];
    if (options.status)
      filters.push(eq(businessEnquiry.status, options.status));
    const [countRow] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessEnquiry)
      .where(and(...filters));
    const total = countRow?.count ?? 0;
    const rows = await database
      .select()
      .from(businessEnquiry)
      .where(and(...filters))
      .orderBy(desc(businessEnquiry.submittedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      enquiries: rows
        .filter(
          (row) =>
            enquiryKinds.includes(row.kind) &&
            (enquiryStatuses as readonly string[]).includes(row.status),
        )
        .map(toEnquiryView),
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
    };
  } catch {
    return { enquiries: [], total: 0, page: 1, pageSize, hasNextPage: false };
  }
}

export function formatEnquiriesAsCsv(enquiries: BusinessEnquiryView[]): string {
  const sanitize = (value: string) =>
    /^[=+\-@]/.test(value) ? `'${value}` : value;
  const escape = (value: string) =>
    `"${sanitize(value).replaceAll('"', '""')}"`;
  const header = [
    "Submitted",
    "Kind",
    "Status",
    "Sender name",
    "Sender email",
    "Sender phone",
    "Preferred time",
    "Message",
  ];
  const rows = enquiries.map((enquiry) =>
    [
      enquiry.submittedAt.toISOString(),
      enquiry.kind,
      enquiry.status,
      enquiry.senderName,
      enquiry.senderEmail ?? "",
      enquiry.senderPhone ?? "",
      enquiry.preferredTime ?? "",
      enquiry.message.replaceAll(/\r?\n/g, " "),
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...rows].join("\r\n");
}

export async function deleteBusinessEnquiry(input: {
  businessId: string;
  enquiryId: string;
}): Promise<"deleted" | "not_found" | "unavailable"> {
  try {
    const database = getDatabase();
    const [deleted] = await database
      .delete(businessEnquiry)
      .where(
        and(
          eq(businessEnquiry.id, input.enquiryId),
          eq(businessEnquiry.businessId, input.businessId),
        ),
      )
      .returning({ id: businessEnquiry.id });
    return deleted ? "deleted" : "not_found";
  } catch {
    return "unavailable";
  }
}

export const enquiryReplyBodySchema = z.string().trim().min(1).max(2000);

export type ReplyToEnquiryResult =
  "sent" | "no_email" | "invalid" | "not_found" | "unavailable";

/**
 * Sends the owner's reply text to the enquiry sender by email and marks the
 * enquiry as replied. The reply text itself is not persisted on the enquiry
 * row — it is recorded by the caller in the admin audit log instead, so this
 * module stays free of a schema change.
 */
export async function replyToBusinessEnquiry(input: {
  businessId: string;
  enquiryId: string;
  body: string;
}): Promise<ReplyToEnquiryResult> {
  const parsedBody = enquiryReplyBodySchema.safeParse(input.body);
  if (!parsedBody.success) return "invalid";

  try {
    const database = getDatabase();
    const [businessRow] = await database
      .select({ tradingName: business.tradingName })
      .from(business)
      .where(eq(business.id, input.businessId))
      .limit(1);
    if (!businessRow) return "not_found";

    const [enquiryRow] = await database
      .select()
      .from(businessEnquiry)
      .where(
        and(
          eq(businessEnquiry.id, input.enquiryId),
          eq(businessEnquiry.businessId, input.businessId),
        ),
      )
      .limit(1);
    if (!enquiryRow) return "not_found";
    if (!enquiryRow.senderEmail) return "no_email";

    await sendTransactionalEmail({
      to: enquiryRow.senderEmail,
      subject: `Re: your ${enquiryRow.kind} to ${businessRow.tradingName}`,
      text: [
        parsedBody.data,
        "",
        "---",
        "You originally wrote:",
        enquiryRow.message.slice(0, 1000),
      ].join("\n"),
    });

    await database
      .update(businessEnquiry)
      .set({ status: "replied", updatedAt: sql`now()` })
      .where(
        and(
          eq(businessEnquiry.id, input.enquiryId),
          eq(businessEnquiry.businessId, input.businessId),
        ),
      );

    return "sent";
  } catch {
    return "unavailable";
  }
}

export async function updateBusinessEnquiryStatus(input: {
  businessId: string;
  enquiryId: string;
  status: EnquiryStatus;
}): Promise<"updated" | "not_found" | "unavailable"> {
  try {
    const database = getDatabase();
    const [updated] = await database
      .update(businessEnquiry)
      .set({ status: input.status, updatedAt: sql`now()` })
      .where(
        and(
          eq(businessEnquiry.id, input.enquiryId),
          eq(businessEnquiry.businessId, input.businessId),
        ),
      )
      .returning({ id: businessEnquiry.id });
    return updated ? "updated" : "not_found";
  } catch {
    return "unavailable";
  }
}
