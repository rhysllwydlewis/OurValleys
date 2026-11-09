import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import {
  businessActivityEvent,
  businessEvent,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import { savedEvent, savedOffer } from "@/lib/database/schema/saved-discovery";
import { hashVisitorSignal } from "./analytics";
import {
  buildContentGroup,
  contentViewEventTypes,
  type ContentKind,
  type ContentPerformanceGroup,
  type ContentPerformanceInput,
} from "./content-insights-model";

const dayMs = 24 * 60 * 60 * 1000;

/**
 * Record one anonymous open of a public offer or event page against the item.
 * The business is read from the item, never from the request, so a caller
 * cannot credit a view to a business that does not own it. Items that are not
 * publicly visible, and demonstration businesses, are not counted. Analytics
 * must never break a visitor's page, so failures are swallowed.
 */
export async function recordContentView(input: {
  kind: ContentKind;
  itemId: string;
  source?: string;
  visitorSignal?: string | null;
}): Promise<boolean> {
  try {
    const database = getDatabase();
    const [row] =
      input.kind === "offer"
        ? await database
            .select({ businessId: businessOffer.businessId })
            .from(businessOffer)
            .innerJoin(business, eq(business.id, businessOffer.businessId))
            .where(
              and(
                eq(businessOffer.id, input.itemId),
                eq(businessOffer.status, "active"),
                eq(business.status, "published"),
                eq(business.isDemo, false),
              ),
            )
            .limit(1)
        : await database
            .select({ businessId: businessEvent.businessId })
            .from(businessEvent)
            .innerJoin(business, eq(business.id, businessEvent.businessId))
            .where(
              and(
                eq(businessEvent.id, input.itemId),
                inArray(businessEvent.status, ["active", "cancelled"]),
                eq(business.status, "published"),
                eq(business.isDemo, false),
              ),
            )
            .limit(1);
    if (!row) return false;
    await database.insert(businessActivityEvent).values({
      businessId: row.businessId,
      eventType: contentViewEventTypes[input.kind],
      source: input.source?.trim().slice(0, 40) || "direct",
      visitorHash: hashVisitorSignal(input.visitorSignal),
      metadata: { itemId: input.itemId },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Views (over the rolling period) and saves (all time) for the business's
 * offers and events that are still listed. Null, not empty, when the read
 * fails, so a fault never reads as "nobody looked".
 */
export async function getContentPerformance(
  businessId: string,
  periodDays: number,
  reference: Date = new Date(),
): Promise<ContentPerformanceGroup[] | null> {
  const days = Math.min(Math.max(Math.floor(periodDays), 1), 365);
  const since = new Date(reference.getTime() - days * dayMs);
  try {
    const database = getDatabase();
    const itemId = sql<string>`${businessActivityEvent.metadata}->>'itemId'`;
    const [viewRows, offers, events, offerSaves, eventSaves] =
      await Promise.all([
        database
          .select({
            eventType: businessActivityEvent.eventType,
            itemId,
            views: sql<number>`count(*)::int`,
          })
          .from(businessActivityEvent)
          .where(
            and(
              eq(businessActivityEvent.businessId, businessId),
              inArray(businessActivityEvent.eventType, [
                "offer_view",
                "event_view",
              ]),
              gte(businessActivityEvent.occurredAt, since),
            ),
          )
          .groupBy(businessActivityEvent.eventType, itemId),
        database
          .select({ id: businessOffer.id, title: businessOffer.title })
          .from(businessOffer)
          .where(
            and(
              eq(businessOffer.businessId, businessId),
              eq(businessOffer.status, "active"),
            ),
          ),
        database
          .select({ id: businessEvent.id, title: businessEvent.title })
          .from(businessEvent)
          .where(
            and(
              eq(businessEvent.businessId, businessId),
              inArray(businessEvent.status, ["active", "cancelled"]),
              sql`coalesce(${businessEvent.endsAt}, ${businessEvent.startsAt}) >= ${since.toISOString()}::timestamptz`,
            ),
          ),
        database
          .select({
            id: savedOffer.offerId,
            saves: sql<number>`count(*)::int`,
          })
          .from(savedOffer)
          .innerJoin(businessOffer, eq(businessOffer.id, savedOffer.offerId))
          .where(eq(businessOffer.businessId, businessId))
          .groupBy(savedOffer.offerId),
        database
          .select({
            id: savedEvent.eventId,
            saves: sql<number>`count(*)::int`,
          })
          .from(savedEvent)
          .innerJoin(businessEvent, eq(businessEvent.id, savedEvent.eventId))
          .where(eq(businessEvent.businessId, businessId))
          .groupBy(savedEvent.eventId),
      ]);

    const views = new Map<string, number>();
    for (const row of viewRows) {
      if (row.itemId) views.set(`${row.eventType}:${row.itemId}`, row.views);
    }
    const saves = (rows: { id: string; saves: number }[]) =>
      new Map(rows.map((row) => [row.id, row.saves]));
    const offerSaveMap = saves(offerSaves);
    const eventSaveMap = saves(eventSaves);

    const items: ContentPerformanceInput[] = [
      ...offers.map((offer) => ({
        kind: "offer" as const,
        itemId: offer.id,
        title: offer.title,
        views: views.get(`offer_view:${offer.id}`) ?? 0,
        saves: offerSaveMap.get(offer.id) ?? 0,
      })),
      ...events.map((event) => ({
        kind: "event" as const,
        itemId: event.id,
        title: event.title,
        views: views.get(`event_view:${event.id}`) ?? 0,
        saves: eventSaveMap.get(event.id) ?? 0,
      })),
    ];
    return [
      buildContentGroup("offer", items),
      buildContentGroup("event", items),
    ];
  } catch {
    return null;
  }
}
