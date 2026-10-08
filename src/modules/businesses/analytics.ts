import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import {
  businessActivityEvent,
  searchZeroResult,
} from "@/lib/database/schema/business-operations";

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

/**
 * Normalises free-text search for zero-result analytics. Text that looks like
 * contact details (an email address or a phone-number-length digit run) is
 * dropped rather than stored, since people sometimes type their own details
 * into a search box.
 */
export function normaliseZeroResultQuery(
  value: string | null | undefined,
): string | null {
  const text = value?.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  if (!text) return null;
  if (text.includes("@")) return null;
  if (text.replace(/\D/g, "").length >= 7) return null;
  return text;
}

/**
 * Records a directory search that matched no businesses (OV-706). Stores only
 * the normalised text and the applied filters, never an identifier.
 */
export async function recordZeroResultSearch(input: {
  query?: string | null;
  categorySlug?: string | null;
  placeSlug?: string | null;
  filterCount: number;
}): Promise<void> {
  try {
    const database = getDatabase();
    await database.insert(searchZeroResult).values({
      queryText: normaliseZeroResultQuery(input.query),
      categorySlug: input.categorySlug?.trim().slice(0, 80) || null,
      placeSlug: input.placeSlug?.trim().slice(0, 80) || null,
      filterCount: Math.max(0, Math.floor(input.filterCount)),
    });
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

export type DailyActivityPoint = {
  /** Calendar day in Europe/London, `YYYY-MM-DD`. */
  date: string;
  views: number;
  contactActions: number;
  enquiries: number;
  /** True for the first day of a rolling window, which only covers part of the day. */
  partial?: boolean;
};

const contactActivityTypes = new Set<string>([
  "call_click",
  "email_click",
  "directions_click",
  "external_click",
  "booking_click",
  "order_click",
]);

const londonDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function londonDayKey(date: Date): string {
  return londonDayFormatter.format(date);
}

/** Number of London calendar days touched by `[from, to]`, both inclusive. */
export function londonDaySpan(from: Date, to: Date): number {
  const [fromYear, fromMonth, fromDay] = londonDayKey(from)
    .split("-")
    .map(Number);
  const [toYear, toMonth, toDay] = londonDayKey(to).split("-").map(Number);
  const dayMs = 24 * 60 * 60 * 1000;
  return (
    Math.round(
      (Date.UTC(toYear!, toMonth! - 1, toDay!) -
        Date.UTC(fromYear!, fromMonth! - 1, fromDay!)) /
        dayMs,
    ) + 1
  );
}

/**
 * Builds a gap-free series of the last `days` London calendar days ending
 * today, so days with no activity render as zero rather than disappearing.
 * Rows outside that window, or with unknown event types, are ignored.
 */
export function buildDailySeries(
  rows: ReadonlyArray<{ day: string; eventType: string; count: number }>,
  days: number,
  now: Date = new Date(),
): DailyActivityPoint[] {
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 366);
  const [year, month, day] = londonDayKey(now).split("-").map(Number);
  const points: DailyActivityPoint[] = [];
  const byDate = new Map<string, DailyActivityPoint>();
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    // Noon UTC keeps the arithmetic clear of DST edges.
    const cursor = new Date(Date.UTC(year!, month! - 1, day! - offset, 12));
    const key = cursor.toISOString().slice(0, 10);
    const point: DailyActivityPoint = {
      date: key,
      views: 0,
      contactActions: 0,
      enquiries: 0,
    };
    points.push(point);
    byDate.set(key, point);
  }
  for (const row of rows) {
    const point = byDate.get(row.day);
    if (!point) continue;
    if (row.eventType === "website_view") point.views += row.count;
    else if (row.eventType === "enquiry") point.enquiries += row.count;
    else if (contactActivityTypes.has(row.eventType))
      point.contactActions += row.count;
  }
  return points;
}

/**
 * Per-day views, contact-button uses and enquiries for the trend chart.
 *
 * It uses exactly the same rolling window as `getBusinessAnalyticsSummary`
 * (starting `periodDays` x 24 hours ago), so the bars add up to the headline
 * figures. That window touches one more London calendar day than the period
 * length, and the first of those days is only partly covered (`partial`).
 */
export async function getBusinessDailyActivity(
  businessId: string,
  periodDays = defaultAnalyticsPeriodDays,
): Promise<DailyActivityPoint[]> {
  const safeDays = Math.min(Math.max(Math.floor(periodDays), 1), 365);
  const now = new Date();
  const since = new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000);
  const span = londonDaySpan(since, now);
  const withPartialFirstDay = (series: DailyActivityPoint[]) =>
    series.map((point, index) =>
      index === 0 ? { ...point, partial: true } : point,
    );
  try {
    const day = sql<string>`to_char((${businessActivityEvent.occurredAt} at time zone 'Europe/London')::date, 'YYYY-MM-DD')`;
    const rows = await getDatabase()
      .select({
        day,
        eventType: businessActivityEvent.eventType,
        count: sql<number>`count(*)::int`,
      })
      .from(businessActivityEvent)
      .where(
        and(
          eq(businessActivityEvent.businessId, businessId),
          gte(businessActivityEvent.occurredAt, since),
          inArray(businessActivityEvent.eventType, [...businessActivityTypes]),
        ),
      )
      .groupBy(day, businessActivityEvent.eventType);
    return withPartialFirstDay(buildDailySeries(rows, span, now));
  } catch {
    return withPartialFirstDay(buildDailySeries([], span, now));
  }
}
