import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
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

export type BusinessAnalyticsSummary = {
  periodDays: number;
  totalViews: number;
  searchAppearances: number;
  qrVisits: number;
  contactActions: number;
  enquiries: number;
  byType: Record<BusinessActivityType, number>;
};

export async function getBusinessAnalyticsSummary(
  businessId: string,
  periodDays = 30,
): Promise<BusinessAnalyticsSummary> {
  const safeDays = Math.min(Math.max(Math.floor(periodDays), 1), 365);
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const empty = Object.fromEntries(
    businessActivityTypes.map((type) => [type, 0]),
  ) as Record<BusinessActivityType, number>;

  try {
    const database = getDatabase();
    const rows = await database
      .select({
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
      .groupBy(businessActivityEvent.eventType);

    for (const row of rows) {
      if (isBusinessActivityType(row.eventType))
        empty[row.eventType] = row.count;
    }

    const contactActions =
      empty.call_click +
      empty.email_click +
      empty.directions_click +
      empty.external_click +
      empty.booking_click +
      empty.order_click;

    return {
      periodDays: safeDays,
      totalViews: empty.website_view,
      searchAppearances: empty.search_appearance,
      qrVisits: empty.qr_visit,
      contactActions,
      enquiries: empty.enquiry,
      byType: empty,
    };
  } catch {
    return {
      periodDays: safeDays,
      totalViews: 0,
      searchAppearances: 0,
      qrVisits: 0,
      contactActions: 0,
      enquiries: 0,
      byType: empty,
    };
  }
}
