/**
 * The admin review desk: one prioritised list over every queue that waits on a
 * platform admin. This module is pure (no database, no framework) so the
 * ordering rules can be tested exhaustively; the loader feeds it.
 */

export const reviewDeskKinds = [
  "business",
  "ticket",
  "report",
  "suggestion",
] as const;
export type ReviewDeskKind = (typeof reviewDeskKinds)[number];

export const reviewDeskKindLabels: Record<ReviewDeskKind, string> = {
  business: "Business review",
  ticket: "Claim or correction",
  report: "Public report",
  suggestion: "Suggested business",
};

export type ReviewDeskRisk = "high" | "standard";

/** Where an item sits against the response time we aim for. */
export type ReviewDeskUrgency = "overdue" | "due_soon" | "on_track";

export type ReviewDeskItem = {
  id: string;
  kind: ReviewDeskKind;
  title: string;
  summary: string;
  /** Short facts shown as chips, e.g. "Duplicate", "High risk". */
  tags: string[];
  risk: ReviewDeskRisk;
  createdAt: Date;
  /** The existing admin screen that owns the resolution for this item. */
  href: string;
  /** Present when the existing row actions can resolve it in place. */
  quickAction: { kind: "suggestion" | "report"; id: string } | null;
};

export type RankedReviewDeskItem = ReviewDeskItem & {
  ageHours: number;
  urgency: ReviewDeskUrgency;
  score: number;
};

/** Target hours to first response, per kind and risk. */
export function responseTargetHours(
  kind: ReviewDeskKind,
  risk: ReviewDeskRisk,
): number {
  if (risk === "high") return 24;
  switch (kind) {
    case "report":
      return 48;
    case "ticket":
    case "business":
      return 72;
    case "suggestion":
      return 168;
  }
}

const kindWeight: Record<ReviewDeskKind, number> = {
  report: 70,
  ticket: 60,
  business: 50,
  suggestion: 20,
};

export function ageInHours(createdAt: Date, now: Date): number {
  return Math.max(0, (now.getTime() - createdAt.getTime()) / 3_600_000);
}

export function urgencyFor(
  kind: ReviewDeskKind,
  risk: ReviewDeskRisk,
  ageHours: number,
): ReviewDeskUrgency {
  const target = responseTargetHours(kind, risk);
  if (ageHours >= target) return "overdue";
  if (ageHours >= target * 0.75) return "due_soon";
  return "on_track";
}

const urgencyRank: Record<ReviewDeskUrgency, number> = {
  overdue: 2,
  due_soon: 1,
  on_track: 0,
};

/**
 * Sorted lexicographically: high risk, then urgency, then kind, then oldest
 * first, so age only breaks ties and never overrides the kind order.
 * `score` is the same ordering as a single number for display and tests.
 */
export function rankReviewDeskItems(
  items: readonly ReviewDeskItem[],
  now: Date,
): RankedReviewDeskItem[] {
  return items
    .map((item) => {
      const ageHours = ageInHours(item.createdAt, now);
      const urgency = urgencyFor(item.kind, item.risk, ageHours);
      const score =
        (item.risk === "high" ? 1000 : 0) +
        urgencyRank[urgency] * 100 +
        kindWeight[item.kind];
      return { ...item, ageHours, urgency, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );
}

export function formatAge(ageHours: number): string {
  if (ageHours < 1) return "Under 1h";
  if (ageHours < 24) return `${Math.floor(ageHours)}h`;
  const days = Math.floor(ageHours / 24);
  return `${days}d`;
}

export const urgencyLabels: Record<ReviewDeskUrgency, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  on_track: "On track",
};

export type ReviewDeskFilter = {
  kind: ReviewDeskKind | null;
  urgency: ReviewDeskUrgency | null;
};

export function parseReviewDeskFilter(params: {
  kind?: string | string[];
  urgency?: string | string[];
}): ReviewDeskFilter {
  const kind = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const urgency = Array.isArray(params.urgency)
    ? params.urgency[0]
    : params.urgency;
  return {
    kind: (reviewDeskKinds as readonly string[]).includes(kind ?? "")
      ? (kind as ReviewDeskKind)
      : null,
    urgency: (["overdue", "due_soon", "on_track"] as const).includes(
      urgency as ReviewDeskUrgency,
    )
      ? (urgency as ReviewDeskUrgency)
      : null,
  };
}

export function filterReviewDeskItems(
  items: readonly RankedReviewDeskItem[],
  filter: ReviewDeskFilter,
): RankedReviewDeskItem[] {
  return items.filter(
    (item) =>
      (!filter.kind || item.kind === filter.kind) &&
      (!filter.urgency || item.urgency === filter.urgency),
  );
}

export type ReviewDeskSummary = {
  total: number;
  overdue: number;
  highRisk: number;
  byKind: Record<ReviewDeskKind, number>;
};

export function summariseReviewDesk(
  items: readonly RankedReviewDeskItem[],
): ReviewDeskSummary {
  const byKind: Record<ReviewDeskKind, number> = {
    business: 0,
    ticket: 0,
    report: 0,
    suggestion: 0,
  };
  let overdue = 0;
  let highRisk = 0;
  for (const item of items) {
    byKind[item.kind] += 1;
    if (item.urgency === "overdue") overdue += 1;
    if (item.risk === "high") highRisk += 1;
  }
  return { total: items.length, overdue, highRisk, byKind };
}

/** Builds the filter URL, dropping defaults so links stay short and stable. */
export function reviewDeskHref(filter: Partial<ReviewDeskFilter>): string {
  const query = new URLSearchParams();
  if (filter.kind) query.set("kind", filter.kind);
  if (filter.urgency) query.set("urgency", filter.urgency);
  const text = query.toString();
  return text ? `/admin/queue?${text}` : "/admin/queue";
}

const ticketTypeLabels: Record<string, string> = {
  claim: "Claim",
  duplicate: "Possible duplicate",
  correction: "Correction",
  slug_change: "Web address change",
};

const reportReasonLabels: Record<string, string> = {
  incorrect_details: "Incorrect details",
  closed_or_moved: "Closed or moved",
  inappropriate_content: "Inappropriate content",
  duplicate_listing: "Duplicate listing",
  cancelled_or_wrong_date: "Cancelled or wrong date",
  abusive_or_offensive: "Abusive or offensive",
  spam_or_advertising: "Spam or advertising",
  fake_or_not_a_customer: "Fake or not a customer",
  off_topic: "Off topic",
  misleading_or_scam: "Misleading or a scam",
  not_available: "Not available",
  other: "Other",
};

function clip(text: string, length: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
}

export function ticketToDeskItem(ticket: {
  id: string;
  businessName: string;
  relatedBusinessName: string | null;
  type: string;
  reason: string;
  riskLevel: "standard" | "high";
  createdAt: Date;
}): ReviewDeskItem {
  const label = ticketTypeLabels[ticket.type] ?? "Ticket";
  return {
    id: `ticket:${ticket.id}`,
    kind: "ticket",
    title: `${label}: ${ticket.businessName}`,
    summary: clip(ticket.reason, 220),
    tags: [
      label,
      ...(ticket.riskLevel === "high" ? ["High risk"] : []),
      ...(ticket.relatedBusinessName
        ? [`Related: ${ticket.relatedBusinessName}`]
        : []),
    ],
    risk: ticket.riskLevel,
    createdAt: ticket.createdAt,
    href: `/admin/tickets/${ticket.id}`,
    quickAction: null,
  };
}

export function reportToDeskItem(report: {
  id: string;
  targetType: "business" | "review" | "event" | "offer" | "update";
  businessTradingName: string;
  eventTitle: string | null;
  offerTitle?: string | null;
  updateTitle?: string | null;
  reason: string;
  details: string | null;
  createdAt: Date;
}): ReviewDeskItem {
  const reason = reportReasonLabels[report.reason] ?? "Report";
  const target =
    report.targetType === "event"
      ? `event “${report.eventTitle ?? "untitled"}”`
      : report.targetType === "offer"
        ? `offer “${report.offerTitle ?? "untitled"}”`
        : report.targetType === "update"
          ? `update “${report.updateTitle ?? "untitled"}”`
          : report.targetType === "review"
            ? "a review"
            : "the listing";
  const sensitive =
    report.reason === "abusive_or_offensive" ||
    report.reason === "inappropriate_content" ||
    report.reason === "misleading_or_scam";
  return {
    id: `report:${report.id}`,
    kind: "report",
    title: `${reason} on ${target} at ${report.businessTradingName}`,
    summary: report.details
      ? clip(report.details, 220)
      : "No further details were given.",
    tags: [
      reason,
      report.targetType === "business"
        ? "Listing"
        : report.targetType === "review"
          ? "Review"
          : report.targetType === "offer"
            ? "Offer"
            : report.targetType === "update"
              ? "Update"
              : "Event",
    ],
    risk: sensitive ? "high" : "standard",
    createdAt: report.createdAt,
    href: "/admin/reports?status=open",
    quickAction: { kind: "report", id: report.id },
  };
}

export function suggestionToDeskItem(suggestion: {
  id: string;
  name: string;
  placeText: string;
  categoryText: string | null;
  note: string | null;
  sameCount: number;
  createdAt: Date;
}): ReviewDeskItem {
  return {
    id: `suggestion:${suggestion.id}`,
    kind: "suggestion",
    title: `${suggestion.name} in ${suggestion.placeText}`,
    summary: suggestion.note
      ? clip(suggestion.note, 220)
      : suggestion.categoryText
        ? `Suggested as ${suggestion.categoryText}.`
        : "A resident suggested this business.",
    tags: [
      ...(suggestion.categoryText ? [suggestion.categoryText] : []),
      ...(suggestion.sameCount > 1
        ? [`Suggested ${suggestion.sameCount} times`]
        : []),
    ],
    risk: "standard",
    createdAt: suggestion.createdAt,
    href: "/admin/suggestions?status=new",
    quickAction: { kind: "suggestion", id: suggestion.id },
  };
}

export function businessToDeskItem(entry: {
  id: string;
  tradingName: string;
  categoryName: string;
  isDemo: boolean;
  updatedAt: Date;
  submittedAt: Date | null;
}): ReviewDeskItem {
  return {
    id: `business:${entry.id}`,
    kind: "business",
    title: `${entry.tradingName} is waiting to be published`,
    summary: `${entry.categoryName} profile submitted for review.`,
    tags: [entry.categoryName, ...(entry.isDemo ? ["Demonstration"] : [])],
    risk: "standard",
    createdAt: entry.submittedAt ?? entry.updatedAt,
    href: `/admin/businesses/${entry.id}`,
    quickAction: null,
  };
}
