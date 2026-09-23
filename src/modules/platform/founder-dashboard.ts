import "server-only";
import { and, asc, count, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  businessPublication,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessActivityEvent } from "@/lib/database/schema/business-operations";

export type CoverageGap = {
  slug: string;
  name: string;
  publishedCount: number;
};

export type ActivityWindowSummary = {
  periodDays: number;
  searchAppearances: number;
  connections: number;
};

export type WeeklyPublishedTrendPoint = {
  /** ISO date (Monday, UTC) marking the start of the week. */
  weekStart: string;
  publishedCount: number;
  cumulativeTotal: number;
};

export type FounderDashboardSummary = {
  activity: ActivityWindowSummary;
  coverage: {
    emptiestPlaces: CoverageGap[];
    emptiestCategories: CoverageGap[];
  };
  activeBusinessesTrend: WeeklyPublishedTrendPoint[];
};

const COVERAGE_LIMIT = 8;
const TREND_WEEKS = 8;
const ACTIVITY_PERIOD_DAYS = 30;

const emptyActivity: ActivityWindowSummary = {
  periodDays: ACTIVITY_PERIOD_DAYS,
  searchAppearances: 0,
  connections: 0,
};

/**
 * Places with the fewest currently-published businesses, active places with
 * zero businesses first. Surfacing sparse coverage is the whole point of
 * this query, so it left-joins from `place` rather than filtering to places
 * that already have a match.
 */
async function listEmptiestPlaces(): Promise<CoverageGap[]> {
  const database = getDatabase();
  const publishedCount = count(businessPublication.id);

  const rows = await database
    .select({
      slug: place.slug,
      name: place.canonicalName,
      publishedCount,
    })
    .from(place)
    .leftJoin(
      businessLocation,
      and(
        eq(businessLocation.placeId, place.id),
        eq(businessLocation.isPrimary, true),
        eq(businessLocation.status, "active"),
      ),
    )
    .leftJoin(
      business,
      and(
        eq(business.id, businessLocation.businessId),
        eq(business.status, "published"),
        isNull(business.suspendedAt),
      ),
    )
    .leftJoin(
      businessPublication,
      and(
        eq(businessPublication.businessId, business.id),
        eq(businessPublication.status, "published"),
        isNotNull(businessPublication.publishedAt),
      ),
    )
    .where(eq(place.status, "active"))
    .groupBy(place.id)
    .orderBy(asc(publishedCount), asc(place.canonicalName))
    .limit(COVERAGE_LIMIT);

  return rows;
}

/** Same idea as {@link listEmptiestPlaces}, grouped by category instead. */
async function listEmptiestCategories(): Promise<CoverageGap[]> {
  const database = getDatabase();
  const publishedCount = count(businessPublication.id);

  const rows = await database
    .select({
      slug: category.slug,
      name: category.name,
      publishedCount,
    })
    .from(category)
    .leftJoin(
      business,
      and(
        eq(business.primaryCategoryId, category.id),
        eq(business.status, "published"),
        isNull(business.suspendedAt),
      ),
    )
    .leftJoin(
      businessPublication,
      and(
        eq(businessPublication.businessId, business.id),
        eq(businessPublication.status, "published"),
        isNotNull(businessPublication.publishedAt),
      ),
    )
    .where(eq(category.status, "active"))
    .groupBy(category.id)
    .orderBy(asc(publishedCount), asc(category.name))
    .limit(COVERAGE_LIMIT);

  return rows;
}

/**
 * Rolling-window search visibility and connection activity across every
 * currently-published business, from the same `business_activity_event`
 * vocabulary already recorded per-business on the owner dashboard.
 */
async function getActivityWindowSummary(
  periodDays = ACTIVITY_PERIOD_DAYS,
): Promise<ActivityWindowSummary> {
  const database = getDatabase();
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const rows = await database
    .select({
      eventType: businessActivityEvent.eventType,
      value: count(),
    })
    .from(businessActivityEvent)
    .innerJoin(business, eq(business.id, businessActivityEvent.businessId))
    .where(
      and(
        gte(businessActivityEvent.occurredAt, since),
        eq(business.status, "published"),
      ),
    )
    .groupBy(businessActivityEvent.eventType);

  const byType = new Map(rows.map((row) => [row.eventType, row.value]));
  const connectionTypes = [
    "call_click",
    "email_click",
    "directions_click",
    "external_click",
    "booking_click",
    "order_click",
    "enquiry",
  ];

  return {
    periodDays,
    searchAppearances: byType.get("search_appearance") ?? 0,
    connections: connectionTypes.reduce(
      (sum, type) => sum + (byType.get(type) ?? 0),
      0,
    ),
  };
}

/** Monday, 00:00 UTC, of the week containing `date`. */
function startOfWeekUtc(date: Date): Date {
  const dayStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const daysSinceMonday = (dayStart.getUTCDay() + 6) % 7;
  dayStart.setUTCDate(dayStart.getUTCDate() - daysSinceMonday);
  return dayStart;
}

/**
 * Buckets `publishedAt` timestamps into weekly counts for the trailing
 * `weeks` weeks (oldest first), each carrying a running cumulative total so
 * the admin view can show both the recent pace and the overall trajectory.
 * Exported separately from the query above so the bucketing logic itself
 * can be unit tested without a database.
 */
export function buildActiveBusinessesTrend(
  publishedDates: readonly Date[],
  weeks = TREND_WEEKS,
  now = new Date(),
): WeeklyPublishedTrendPoint[] {
  const currentWeekStart = startOfWeekUtc(now);
  const windowStart = new Date(currentWeekStart);
  windowStart.setUTCDate(windowStart.getUTCDate() - (weeks - 1) * 7);

  const sorted = [...publishedDates].sort((a, b) => a.getTime() - b.getTime());
  let cumulativeTotal = sorted.filter((date) => date < windowStart).length;

  const points: WeeklyPublishedTrendPoint[] = [];
  for (let index = 0; index < weeks; index += 1) {
    const weekStart = new Date(windowStart);
    weekStart.setUTCDate(weekStart.getUTCDate() + index * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const publishedCount = sorted.filter(
      (date) => date >= weekStart && date < weekEnd,
    ).length;
    cumulativeTotal += publishedCount;

    points.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      publishedCount,
      cumulativeTotal,
    });
  }

  return points;
}

async function getActiveBusinessesTrend(): Promise<
  WeeklyPublishedTrendPoint[]
> {
  const database = getDatabase();
  const rows = await database
    .select({ publishedAt: businessPublication.publishedAt })
    .from(businessPublication)
    .where(
      and(
        eq(businessPublication.status, "published"),
        isNotNull(businessPublication.publishedAt),
      ),
    );

  const publishedDates = rows
    .map((row) => row.publishedAt)
    .filter((value): value is Date => value !== null);

  return buildActiveBusinessesTrend(publishedDates);
}

const emptySummary: FounderDashboardSummary = {
  activity: emptyActivity,
  coverage: { emptiestPlaces: [], emptiestCategories: [] },
  activeBusinessesTrend: [],
};

/**
 * Aggregates the platform-health signals OV-1202 calls for (coverage,
 * search success and connections, plus an active-businesses trend) that
 * the admin overview previously had no visibility into beyond a single
 * moderation queue. Read-only; failure degrades to an empty summary so a
 * database hiccup never breaks the rest of the admin overview page.
 */
export async function getFounderDashboardSummary(): Promise<FounderDashboardSummary> {
  try {
    const [
      activity,
      emptiestPlaces,
      emptiestCategories,
      activeBusinessesTrend,
    ] = await Promise.all([
      getActivityWindowSummary(),
      listEmptiestPlaces(),
      listEmptiestCategories(),
      getActiveBusinessesTrend(),
    ]);

    return {
      activity,
      coverage: { emptiestPlaces, emptiestCategories },
      activeBusinessesTrend,
    };
  } catch {
    return emptySummary;
  }
}
