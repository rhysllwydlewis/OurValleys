import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import {
  businessActivityEvent,
  businessEvent,
  businessOffer,
  businessUpdate,
} from "@/lib/database/schema/business-operations";
import { savedEvent, savedOffer } from "@/lib/database/schema/saved-discovery";
import { hashVisitorSignal } from "./analytics";
import { findCatalogueEntry } from "./catalogue-page-model";
import { listCategorySections } from "./content-features";
import { hasEntryPage, publicExtraSections } from "./extra-sections-model";
import {
  VIEW_DEDUPE_MINUTES,
  buildContentGroup,
  contentGroupOrder,
  contentViewEventTypes,
  type ContentKind,
  type ContentPerformanceGroup,
  type ContentPerformanceInput,
} from "./content-insights-model";

const dayMs = 24 * 60 * 60 * 1000;

/** The business that owns a publicly visible item, or null when it is not counted. */
async function resolveOwner(input: {
  kind: ContentKind;
  itemId: string;
  businessSlug?: string;
}): Promise<string | null> {
  const database = getDatabase();
  if (input.kind === "catalogue") {
    // Catalogue entries live inside a business's lists, so the entry is only
    // credited to the business it is found in, and only while publicly shown.
    const slug = input.businessSlug?.trim().toLowerCase();
    if (!slug) return null;
    const [owner] = await database
      .select({ id: business.id })
      .from(business)
      .where(
        and(
          eq(business.slug, slug),
          eq(business.status, "published"),
          eq(business.isDemo, false),
        ),
      )
      .limit(1);
    if (!owner) return null;
    const sections = publicExtraSections(
      await listCategorySections(owner.id, true),
    );
    return findCatalogueEntry(sections, input.itemId) ? owner.id : null;
  }
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
      : input.kind === "event"
        ? await database
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
            .limit(1)
        : await database
            .select({ businessId: businessUpdate.businessId })
            .from(businessUpdate)
            .innerJoin(business, eq(business.id, businessUpdate.businessId))
            .where(
              and(
                eq(businessUpdate.id, input.itemId),
                eq(businessUpdate.status, "published"),
                eq(business.status, "published"),
                eq(business.isDemo, false),
              ),
            )
            .limit(1);
  return row?.businessId ?? null;
}

/**
 * Record one anonymous open of a public offer, event, update or catalogue
 * entry page against the item. The business is read from the item (for a
 * catalogue entry, confirmed by finding the entry in that business's public
 * lists), never trusted from the request, so a caller cannot credit a view to
 * a business that does not own it. Items that are not publicly visible, and
 * demonstration businesses, are not counted. A repeat open of the same item by
 * the same visitor within VIEW_DEDUPE_MINUTES counts once. Analytics must
 * never break a visitor's page, so failures are swallowed.
 */
export async function recordContentView(input: {
  kind: ContentKind;
  itemId: string;
  /** Needed for catalogue entries, which are found through their business. */
  businessSlug?: string;
  source?: string;
  visitorSignal?: string | null;
  now?: Date;
}): Promise<boolean> {
  try {
    const database = getDatabase();
    const itemId = input.itemId.toLowerCase();
    const businessId = await resolveOwner({ ...input, itemId });
    if (!businessId) return false;
    const eventType = contentViewEventTypes[input.kind];
    const visitorHash = hashVisitorSignal(input.visitorSignal);
    const now = input.now ?? new Date();
    if (visitorHash) {
      const since = new Date(now.getTime() - VIEW_DEDUPE_MINUTES * 60 * 1000);
      const [recent] = await database
        .select({ id: businessActivityEvent.id })
        .from(businessActivityEvent)
        .where(
          and(
            eq(businessActivityEvent.businessId, businessId),
            eq(businessActivityEvent.eventType, eventType),
            eq(businessActivityEvent.visitorHash, visitorHash),
            gte(businessActivityEvent.occurredAt, since),
            sql`${businessActivityEvent.metadata}->>'itemId' = ${itemId}`,
          ),
        )
        .limit(1);
      if (recent) return false;
    }
    await database.insert(businessActivityEvent).values({
      businessId,
      eventType,
      source: input.source?.trim().slice(0, 40) || "direct",
      visitorHash,
      metadata: { itemId },
      occurredAt: now,
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
    const [
      viewRows,
      offers,
      events,
      offerSaves,
      eventSaves,
      updates,
      sections,
    ] = await Promise.all([
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
            inArray(
              businessActivityEvent.eventType,
              Object.values(contentViewEventTypes),
            ),
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
      database
        .select({ id: businessUpdate.id, title: businessUpdate.title })
        .from(businessUpdate)
        .where(
          and(
            eq(businessUpdate.businessId, businessId),
            eq(businessUpdate.status, "published"),
          ),
        ),
      listCategorySections(businessId, true),
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
      ...updates.map((update) => ({
        kind: "update" as const,
        itemId: update.id,
        title: update.title,
        views: views.get(`update_view:${update.id}`) ?? 0,
        saves: 0,
      })),
      ...publicExtraSections(sections).flatMap((section) =>
        hasEntryPage(section.sectionType)
          ? section.entries.flatMap((entry) =>
              entry.id
                ? [
                    {
                      kind: "catalogue" as const,
                      itemId: entry.id,
                      title: entry.title,
                      views: views.get(`catalogue_view:${entry.id}`) ?? 0,
                      saves: 0,
                    },
                  ]
                : [],
            )
          : [],
      ),
    ];
    return contentGroupOrder.map((kind) => buildContentGroup(kind, items));
  } catch {
    return null;
  }
}
