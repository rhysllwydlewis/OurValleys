import { z } from "zod";
import type {
  EnquiryKind,
  EnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";

/**
 * Pure rules for the owner inbox (`/dashboard/business/[id]/inbox`): which
 * mailbox a status belongs to, how the address bar maps to a query, and the
 * small display helpers. No database or request access here so every rule is
 * unit-testable.
 */

export const inboxBoxes = [
  "inbox",
  "unread",
  "replied",
  "done",
  "spam",
  "all",
] as const;
export type InboxBox = (typeof inboxBoxes)[number];

export const inboxKinds = ["enquiry", "quote", "callback"] as const;

export const INBOX_PAGE_SIZE = 25;
export const INBOX_SEARCH_MAX_LENGTH = 80;
export const INBOX_BULK_LIMIT = 50;

/** Statuses a mailbox shows; `null` means every status. */
export const boxStatuses: Record<InboxBox, readonly EnquiryStatus[] | null> = {
  inbox: ["new", "read"],
  unread: ["new"],
  replied: ["replied"],
  done: ["closed", "archived"],
  spam: ["spam"],
  all: null,
};

export const defaultInboxBox: InboxBox = "inbox";

export type InboxQuery = {
  box: InboxBox;
  kind: EnquiryKind | null;
  /** Free-text search, already trimmed and shortened. */
  q: string;
  page: number;
  /** The enquiry open in the reading pane, if the id is well formed. */
  enquiryId: string | null;
};

type RawInboxQuery = {
  box?: string | string[];
  kind?: string | string[];
  q?: string | string[];
  page?: string | string[];
  enquiry?: string | string[];
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Turns untrusted address-bar values into a safe query; never throws. */
export function parseInboxQuery(raw: RawInboxQuery): InboxQuery {
  const box = first(raw.box);
  const kind = first(raw.kind);
  const page = Number(first(raw.page));
  const enquiryId = first(raw.enquiry);
  return {
    box: (inboxBoxes as readonly string[]).includes(box ?? "")
      ? (box as InboxBox)
      : defaultInboxBox,
    kind: (inboxKinds as readonly string[]).includes(kind ?? "")
      ? (kind as EnquiryKind)
      : null,
    q: (first(raw.q) ?? "")
      .replaceAll(/\s+/g, " ")
      .trim()
      .slice(0, INBOX_SEARCH_MAX_LENGTH),
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
    enquiryId: z.uuid().safeParse(enquiryId).success
      ? (enquiryId ?? null)
      : null,
  };
}

/**
 * Builds an inbox address from a parsed query. Defaults are left out so links
 * stay short. Used for every link and every post-action redirect, so a form
 * never carries a free-form return path.
 */
export function buildInboxHref(
  businessId: string,
  query: InboxQuery,
  overrides: Partial<InboxQuery> = {},
): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.box !== defaultInboxBox) params.set("box", next.box);
  if (next.kind) params.set("kind", next.kind);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.enquiryId) params.set("enquiry", next.enquiryId);
  const search = params.toString();
  return `/dashboard/business/${businessId}/inbox${search ? `?${search}` : ""}`;
}

/** Escapes `%`, `_` and `\` so owner search text is matched literally. */
export function escapeLikePattern(value: string): string {
  return value.replaceAll(/[\\%_]/g, (character) => `\\${character}`);
}

export type InboxCounts = Record<InboxBox, number>;

export function emptyInboxCounts(): InboxCounts {
  return { inbox: 0, unread: 0, replied: 0, done: 0, spam: 0, all: 0 };
}

/** Folds per-status counts into the mailbox counts shown as filter chips. */
export function countsByBox(
  perStatus: Partial<Record<EnquiryStatus, number>>,
): InboxCounts {
  const counts = emptyInboxCounts();
  for (const box of inboxBoxes) {
    const statuses = boxStatuses[box];
    counts[box] = statuses
      ? statuses.reduce((sum, status) => sum + (perStatus[status] ?? 0), 0)
      : Object.values(perStatus).reduce((sum, value) => sum + (value ?? 0), 0);
  }
  return counts;
}

/**
 * Statuses an owner can set in bulk. `replied` is deliberately absent: it is
 * only ever set by actually sending a reply.
 */
export const bulkStatuses = [
  "read",
  "new",
  "closed",
  "archived",
  "spam",
] as const satisfies readonly EnquiryStatus[];
export type BulkStatus = (typeof bulkStatuses)[number];

export function isBulkStatus(value: string): value is BulkStatus {
  return (bulkStatuses as readonly string[]).includes(value);
}

/** Dedupes and caps a posted id list, dropping anything that is not a UUID. */
export function parseSelectedIds(values: readonly unknown[]): string[] {
  const ids = new Set<string>();
  for (const value of values) {
    if (typeof value === "string" && z.uuid().safeParse(value).success) {
      ids.add(value);
    }
    if (ids.size >= INBOX_BULK_LIMIT) break;
  }
  return [...ids];
}

/** Up to two capital letters for the avatar circle. */
export function senderInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word));
  if (words.length === 0) return "?";
  const letters = words
    .slice(0, 2)
    .map((word) => [...word.replace(/^[^\p{L}]+/u, "")][0] ?? "");
  return letters.join("").toLocaleUpperCase("en-GB") || "?";
}

/** One-line preview of a message for the list. */
export function messageSnippet(message: string, maxLength = 110): string {
  const flat = message.replaceAll(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  return `${flat.slice(0, maxLength - 1).trimEnd()}…`;
}

export const replyTemplateIds = [
  "thanks",
  "moreInfo",
  "quote",
  "callback",
  "cannotHelp",
] as const;
export type ReplyTemplateId = (typeof replyTemplateIds)[number];

/** Templates that make sense for each kind of enquiry, best first. */
export function replyTemplatesFor(kind: EnquiryKind): ReplyTemplateId[] {
  switch (kind) {
    case "quote":
      return ["quote", "moreInfo", "thanks", "cannotHelp"];
    case "callback":
      return ["callback", "thanks", "cannotHelp"];
    default:
      return ["thanks", "moreInfo", "cannotHelp"];
  }
}

/**
 * Whether a status change still counts as "needs attention": used to decide
 * which mailbox to land on after handling an enquiry.
 */
export function needsAttention(status: EnquiryStatus): boolean {
  return status === "new" || status === "read";
}
