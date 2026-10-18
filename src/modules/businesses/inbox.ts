import "server-only";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessEnquiry } from "@/lib/database/schema/business-operations";
import {
  computeEnquiryRetentionExpiry,
  enquiryStatuses,
  type EnquiryKind,
  type EnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";
import {
  boxStatuses,
  countsByBox,
  emptyInboxCounts,
  escapeLikePattern,
  INBOX_BULK_LIMIT,
  INBOX_PAGE_SIZE,
  type BulkStatus,
  type InboxCounts,
  type InboxQuery,
} from "@/modules/businesses/inbox-model";

/**
 * Read and bulk-write side of the owner inbox. Every query is scoped to one
 * business id, and callers must already have checked the manage-enquiries
 * permission for that business. Reading never exposes anything but the
 * enquiry's own fields; no private account data is joined in.
 */

export type InboxEnquiry = {
  id: string;
  kind: EnquiryKind;
  status: EnquiryStatus;
  senderName: string;
  senderEmail: string | null;
  senderPhone: string | null;
  message: string;
  preferredTime: string | null;
  submittedAt: Date;
  firstRepliedAt: Date | null;
};

const kinds: readonly string[] = ["enquiry", "quote", "callback"];

function toInboxEnquiry(
  row: typeof businessEnquiry.$inferSelect,
): InboxEnquiry | null {
  if (
    !kinds.includes(row.kind) ||
    !(enquiryStatuses as readonly string[]).includes(row.status)
  ) {
    return null;
  }
  return {
    id: row.id,
    kind: row.kind as EnquiryKind,
    status: row.status as EnquiryStatus,
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    senderPhone: row.senderPhone,
    message: row.message,
    preferredTime: row.preferredTime,
    submittedAt: row.submittedAt,
    firstRepliedAt: row.firstRepliedAt,
  };
}

function matchesFilters(businessId: string, query: InboxQuery) {
  const filters = [eq(businessEnquiry.businessId, businessId)];
  const statuses = boxStatuses[query.box];
  if (statuses) filters.push(inArray(businessEnquiry.status, [...statuses]));
  if (query.kind) filters.push(eq(businessEnquiry.kind, query.kind));
  if (query.q) {
    const pattern = `%${escapeLikePattern(query.q)}%`;
    const search = or(
      sql`${businessEnquiry.senderName} ilike ${pattern}`,
      sql`${businessEnquiry.senderEmail} ilike ${pattern}`,
      sql`${businessEnquiry.senderPhone} ilike ${pattern}`,
      sql`${businessEnquiry.message} ilike ${pattern}`,
    );
    if (search) filters.push(search);
  }
  return and(...filters);
}

export type InboxPage = {
  enquiries: InboxEnquiry[];
  total: number;
  page: number;
  hasNextPage: boolean;
  /** False when the database could not be read, so the page can say so. */
  available: boolean;
};

export async function listInbox(
  businessId: string,
  query: InboxQuery,
): Promise<InboxPage> {
  try {
    const database = getDatabase();
    const where = matchesFilters(businessId, query);
    const [countRow] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessEnquiry)
      .where(where);
    const total = countRow?.count ?? 0;
    const lastPage = Math.max(1, Math.ceil(total / INBOX_PAGE_SIZE));
    const page = Math.min(query.page, lastPage);
    const rows = await database
      .select()
      .from(businessEnquiry)
      .where(where)
      .orderBy(desc(businessEnquiry.submittedAt), desc(businessEnquiry.id))
      .limit(INBOX_PAGE_SIZE)
      .offset((page - 1) * INBOX_PAGE_SIZE);
    return {
      enquiries: rows
        .map(toInboxEnquiry)
        .filter((row): row is InboxEnquiry => row !== null),
      total,
      page,
      hasNextPage: page * INBOX_PAGE_SIZE < total,
      available: true,
    };
  } catch {
    return {
      enquiries: [],
      total: 0,
      page: 1,
      hasNextPage: false,
      available: false,
    };
  }
}

/** One enquiry for the reading pane, only if it belongs to this business. */
export async function getInboxEnquiry(
  businessId: string,
  enquiryId: string,
): Promise<InboxEnquiry | null> {
  try {
    const [row] = await getDatabase()
      .select()
      .from(businessEnquiry)
      .where(
        and(
          eq(businessEnquiry.id, enquiryId),
          eq(businessEnquiry.businessId, businessId),
        ),
      )
      .limit(1);
    return row ? toInboxEnquiry(row) : null;
  } catch {
    return null;
  }
}

/** Mailbox counts for the filter chips; all zero when unreadable. */
export async function getInboxCounts(
  businessId: string,
): Promise<{ counts: InboxCounts; available: boolean }> {
  try {
    const rows = await getDatabase()
      .select({
        status: businessEnquiry.status,
        count: sql<number>`count(*)::int`,
      })
      .from(businessEnquiry)
      .where(eq(businessEnquiry.businessId, businessId))
      .groupBy(businessEnquiry.status);
    const perStatus: Partial<Record<EnquiryStatus, number>> = {};
    for (const row of rows) {
      if ((enquiryStatuses as readonly string[]).includes(row.status)) {
        perStatus[row.status as EnquiryStatus] = row.count;
      }
    }
    return { counts: countsByBox(perStatus), available: true };
  } catch {
    return { counts: emptyInboxCounts(), available: false };
  }
}

/** Number of unread enquiries, for the badge on the dashboard tab. */
export async function countUnreadEnquiries(
  businessId: string,
): Promise<number> {
  try {
    const [row] = await getDatabase()
      .select({ count: sql<number>`count(*)::int` })
      .from(businessEnquiry)
      .where(
        and(
          eq(businessEnquiry.businessId, businessId),
          eq(businessEnquiry.status, "new"),
        ),
      );
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Opening an enquiry reads it. Only a `new` enquiry changes, in a single
 * conditional update, so opening a replied or closed enquiry never moves it
 * backwards and two tabs cannot race each other.
 */
export async function markEnquiryRead(
  businessId: string,
  enquiryId: string,
): Promise<"updated" | "unchanged" | "unavailable"> {
  try {
    const rows = await getDatabase()
      .update(businessEnquiry)
      .set({ status: "read", updatedAt: sql`now()` })
      .where(
        and(
          eq(businessEnquiry.id, enquiryId),
          eq(businessEnquiry.businessId, businessId),
          eq(businessEnquiry.status, "new"),
        ),
      )
      .returning({ id: businessEnquiry.id });
    return rows.length > 0 ? "updated" : "unchanged";
  } catch {
    return "unavailable";
  }
}

export type BulkStatusResult =
  | { status: "updated"; updated: number; skipped: number }
  | { status: "invalid" }
  | { status: "unavailable" };

/**
 * Sets one status on several enquiries of one business. Ids belonging to
 * another business simply do not match, so they are skipped rather than
 * touched. A `replied` enquiry is never moved back to new or read, because
 * replied is only reached by sending a reply. The retention expiry is
 * recomputed per row, exactly as for a single status change.
 */
export async function bulkSetEnquiryStatus(input: {
  businessId: string;
  enquiryIds: readonly string[];
  status: BulkStatus;
}): Promise<BulkStatusResult> {
  if (input.enquiryIds.length === 0) return { status: "invalid" };
  const ids = input.enquiryIds.slice(0, INBOX_BULK_LIMIT);
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      const rows = await transaction
        .select({
          id: businessEnquiry.id,
          status: businessEnquiry.status,
          submittedAt: businessEnquiry.submittedAt,
          firstRepliedAt: businessEnquiry.firstRepliedAt,
        })
        .from(businessEnquiry)
        .where(
          and(
            eq(businessEnquiry.businessId, input.businessId),
            inArray(businessEnquiry.id, ids),
          ),
        );
      const now = new Date();
      let updated = 0;
      for (const row of rows) {
        const target = effectiveStatus(
          input.status,
          row.firstRepliedAt !== null,
        );
        if (row.status === target) continue;
        // The guards sit in the UPDATE itself so a reply sent a moment ago
        // can never be overwritten by a stale selection.
        const changed = await transaction
          .update(businessEnquiry)
          .set({
            status: target,
            updatedAt: sql`now()`,
            retentionExpiresAt: computeEnquiryRetentionExpiry(
              target,
              row.submittedAt,
              now,
            ),
          })
          .where(
            and(
              eq(businessEnquiry.id, row.id),
              eq(businessEnquiry.businessId, input.businessId),
              ne(businessEnquiry.status, target),
              ...(target === "new" || target === "read"
                ? [
                    ne(businessEnquiry.status, "replied"),
                    isNull(businessEnquiry.firstRepliedAt),
                  ]
                : []),
            ),
          )
          .returning({ id: businessEnquiry.id });
        updated += changed.length;
      }
      return {
        status: "updated" as const,
        updated,
        skipped: ids.length - updated,
      };
    });
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * One status change from the reading pane. Moving back to new or read never
 * applies to a replied enquiry (only a sent reply sets replied), and the rule
 * lives in the UPDATE so it holds against concurrent replies and forged posts.
 */
export async function setInboxEnquiryStatus(input: {
  businessId: string;
  enquiryId: string;
  status: BulkStatus;
}): Promise<"updated" | "unchanged" | "not_found" | "unavailable"> {
  try {
    const database = getDatabase();
    const [existing] = await database
      .select({
        submittedAt: businessEnquiry.submittedAt,
        firstRepliedAt: businessEnquiry.firstRepliedAt,
      })
      .from(businessEnquiry)
      .where(
        and(
          eq(businessEnquiry.id, input.enquiryId),
          eq(businessEnquiry.businessId, input.businessId),
        ),
      )
      .limit(1);
    if (!existing) return "not_found";
    const target = effectiveStatus(
      input.status,
      existing.firstRepliedAt !== null,
    );
    const changed = await database
      .update(businessEnquiry)
      .set({
        status: target,
        updatedAt: sql`now()`,
        retentionExpiresAt: computeEnquiryRetentionExpiry(
          target,
          existing.submittedAt,
          new Date(),
        ),
      })
      .where(
        and(
          eq(businessEnquiry.id, input.enquiryId),
          eq(businessEnquiry.businessId, input.businessId),
          ne(businessEnquiry.status, target),
          ...(target === "new" || target === "read"
            ? [
                ne(businessEnquiry.status, "replied"),
                isNull(businessEnquiry.firstRepliedAt),
              ]
            : []),
        ),
      )
      .returning({ id: businessEnquiry.id });
    return changed.length > 0 ? "updated" : "unchanged";
  } catch {
    return "unavailable";
  }
}

/**
 * Reopening (new or read) an enquiry that was ever replied to restores it to
 * replied, never to the to-do mailbox: only a sent reply earns that status,
 * and only moving it to done, archived or spam takes it away.
 */
function effectiveStatus(
  requested: BulkStatus,
  everReplied: boolean,
): EnquiryStatus {
  return everReplied && (requested === "new" || requested === "read")
    ? "replied"
    : requested;
}
