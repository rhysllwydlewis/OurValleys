import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import { businessActivityEvent } from "@/lib/database/schema/business-operations";

export const businessActivityTypes = [
  "website_view",
  "search_appearance",
  "call_click",
  "email_click",
  "enquiry",
  "directions_click",
  "external_click",
  "booking_click",
  "order_click",
  "qr_visit",
] as const;

export type BusinessActivityType = (typeof businessActivityTypes)[number];

const publicActivityTypes = new Set<string>(businessActivityTypes);

export function isBusinessActivityType(
  value: string,
): value is BusinessActivityType {
  return publicActivityTypes.has(value);
}

export function hashVisitorSignal(
  value: string | null | undefined,
): string | null {
  const normalised = value?.trim();
  if (!normalised) return null;
  return createHash("sha256").update(normalised).digest("hex");
}

export async function recordBusinessActivity(input: {
  businessId: string;
  eventType: BusinessActivityType;
  source?: string;
  visitorHash?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const database = getDatabase();
    const [published] = await database
      .select({ id: business.id })
      .from(business)
      .where(
        and(
          eq(business.id, input.businessId),
          eq(business.status, "published"),
        ),
      )
      .limit(1);
    if (!published) return;

    await database.insert(businessActivityEvent).values({
      businessId: input.businessId,
      eventType: input.eventType,
      source: input.source?.trim().slice(0, 40) || "direct",
      visitorHash: input.visitorHash ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Analytics must never break the visitor or owner journey.
  }
}

export async function recordSearchAppearances(
  businessIds: readonly string[],
): Promise<void> {
  const unique = [...new Set(businessIds)].slice(0, 50);
  if (unique.length === 0) return;

  try {
    const database = getDatabase();
    await database.insert(businessActivityEvent).values(
      unique.map((businessId) => ({
        businessId,
        eventType: "search_appearance",
        source: "directory",
      })),
    );
  } catch {
    // Search remains available even if measurement is unavailable.
  }
}

export const analyticsPeriodOptions = [7, 30, 90] as const;
export const defaultAnalyticsPeriodDays = 30;

/** Parses a `period` query value, falling back to the default window. */
export function parseAnalyticsPeriod(value: string | undefined): number {
  const days = Number(value);
  return (analyticsPeriodOptions as readonly number[]).includes(days)
    ? days
    : defaultAnalyticsPeriodDays;
}

export type BusinessAnalyticsTotals = {
  totalViews: number;
  searchAppearances: number;
  qrVisits: number;
  contactActions: number;
  enquiries: number;
};

export type BusinessAnalyticsSummary = BusinessAnalyticsTotals & {
  periodDays: number;
  byType: Record<BusinessActivityType, number>;
  /** Totals for the equally long window immediately before this one. */
  previous: BusinessAnalyticsTotals;
};

export type PeriodChange =
  | { kind: "none" }
  | { kind: "new"; delta: number }
  | { kind: "same" }
  | { kind: "change"; delta: number; percent: number };

/**
 * Describes how a count moved against the previous period. A zero baseline has
 * no meaningful percentage, so it is reported as "new" (or "none" when both
 * windows are empty).
 */
export function describePeriodChange(
  current: number,
  previous: number,
): PeriodChange {
  if (current === 0 && previous === 0) return { kind: "none" };
  if (previous === 0) return { kind: "new", delta: current };
  if (current === previous) return { kind: "same" };
  return {
    kind: "change",
    delta: current - previous,
    percent: Math.round(((current - previous) / previous) * 100),
  };
}

function emptyCounts() {
  return Object.fromEntries(
    businessActivityTypes.map((type) => [type, 0]),
  ) as Record<BusinessActivityType, number>;
}

function totalsFromCounts(
  counts: Record<BusinessActivityType, number>,
): BusinessAnalyticsTotals {
  return {
    totalViews: counts.website_view,
    searchAppearances: counts.search_appearance,
    qrVisits: counts.qr_visit,
    contactActions:
      counts.call_click +
      counts.email_click +
      counts.directions_click +
      counts.external_click +
      counts.booking_click +
      counts.order_click,
    enquiries: counts.enquiry,
  };
}

async function countActivityByType(
  businessId: string,
  from: Date,
  until?: Date,
) {
  const counts = emptyCounts();
  const rows = await getDatabase()
    .select({
      eventType: businessActivityEvent.eventType,
      count: sql<number>`count(*)::int`,
    })
    .from(businessActivityEvent)
    .where(
      and(
        eq(businessActivityEvent.businessId, businessId),
        gte(businessActivityEvent.occurredAt, from),
        until ? lt(businessActivityEvent.occurredAt, until) : undefined,
        inArray(businessActivityEvent.eventType, [...businessActivityTypes]),
      ),
    )
    .groupBy(businessActivityEvent.eventType);

  for (const row of rows) {
    if (isBusinessActivityType(row.eventType))
      counts[row.eventType] = row.count;
  }
  return counts;
}

export async function getBusinessAnalyticsSummary(
  businessId: string,
  periodDays = defaultAnalyticsPeriodDays,
): Promise<BusinessAnalyticsSummary> {
  const safeDays = Math.min(Math.max(Math.floor(periodDays), 1), 365);
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const since = new Date(now - safeDays * dayMs);
  const previousSince = new Date(now - safeDays * 2 * dayMs);

  try {
    const [current, previous] = await Promise.all([
      countActivityByType(businessId, since),
      countActivityByType(businessId, previousSince, since),
    ]);
    return {
      periodDays: safeDays,
      ...totalsFromCounts(current),
      byType: current,
      previous: totalsFromCounts(previous),
    };
  } catch {
    const empty = emptyCounts();
    return {
      periodDays: safeDays,
      ...totalsFromCounts(empty),
      byType: empty,
      previous: totalsFromCounts(empty),
    };
  }
}
