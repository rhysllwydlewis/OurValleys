import "server-only";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessActivityEvent } from "@/lib/database/schema/business-operations";
import {
  buildClickSurfaces,
  contactChannelTypes,
  type ClickSurfaceRow,
} from "./insights-model";
import {
  buildSourceBreakdown,
  type SourceBreakdownRow,
} from "./traffic-source";

const dayMs = 24 * 60 * 60 * 1000;

function clampDays(periodDays: number): number {
  return Math.min(Math.max(Math.floor(periodDays), 1), 365);
}

/**
 * Where page views came from over the rolling period, as labelled shares.
 * Only `website_view` rows carry a traffic source, and `qr_visit` is the QR
 * scan counted separately, so neither is added twice.
 */
export async function getTrafficSources(
  businessId: string,
  periodDays: number,
  reference: Date = new Date(),
): Promise<SourceBreakdownRow[]> {
  const since = new Date(reference.getTime() - clampDays(periodDays) * dayMs);
  try {
    const rows = await getDatabase()
      .select({
        source: businessActivityEvent.source,
        count: sql<number>`count(*)::int`,
      })
      .from(businessActivityEvent)
      .where(
        and(
          eq(businessActivityEvent.businessId, businessId),
          eq(businessActivityEvent.eventType, "website_view"),
          gte(businessActivityEvent.occurredAt, since),
        ),
      )
      .groupBy(businessActivityEvent.source);
    return buildSourceBreakdown(rows);
  } catch {
    return [];
  }
}

export async function getClickSurfaces(
  businessId: string,
  periodDays: number,
  reference: Date = new Date(),
): Promise<ClickSurfaceRow[]> {
  const since = new Date(reference.getTime() - clampDays(periodDays) * dayMs);
  try {
    const rows = await getDatabase()
      .select({
        source: businessActivityEvent.source,
        count: sql<number>`count(*)::int`,
      })
      .from(businessActivityEvent)
      .where(
        and(
          eq(businessActivityEvent.businessId, businessId),
          inArray(businessActivityEvent.eventType, [...contactChannelTypes]),
          gte(businessActivityEvent.occurredAt, since),
        ),
      )
      .groupBy(businessActivityEvent.source);
    return buildClickSurfaces(rows);
  } catch {
    return [];
  }
}

export type VisitorEstimate = {
  /** Distinct anonymous visitor signals in the period. */
  visitors: number;
  previous: number;
};

/**
 * Approximate distinct visitors: how many different anonymous signals viewed
 * the site. It is an estimate (a shared network or a changed browser counts
 * differently), so the page labels it as one.
 */
export async function getVisitorEstimate(
  businessId: string,
  periodDays: number,
  reference: Date = new Date(),
): Promise<VisitorEstimate> {
  const days = clampDays(periodDays);
  const now = reference.getTime();
  const since = new Date(now - days * dayMs);
  const previousSince = new Date(now - days * 2 * dayMs);
  const count = async (from: Date, until?: Date) => {
    const [row] = await getDatabase()
      .select({
        visitors: sql<number>`count(distinct ${businessActivityEvent.visitorHash})::int`,
      })
      .from(businessActivityEvent)
      .where(
        and(
          eq(businessActivityEvent.businessId, businessId),
          eq(businessActivityEvent.eventType, "website_view"),
          gte(businessActivityEvent.occurredAt, from),
          until ? lt(businessActivityEvent.occurredAt, until) : undefined,
        ),
      );
    return row?.visitors ?? 0;
  };
  try {
    const [visitors, previous] = await Promise.all([
      count(since),
      count(previousSince, since),
    ]);
    return { visitors, previous };
  } catch {
    return { visitors: 0, previous: 0 };
  }
}
