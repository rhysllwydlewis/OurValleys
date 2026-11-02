import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  businessPublication,
  businessSite,
  category,
  place,
} from "@/lib/database/schema/business";
import {
  businessEvent,
  businessOffer,
  offerTranslation,
} from "@/lib/database/schema/business-operations";
import {
  savedBusiness,
  savedEvent,
  savedOffer,
  savedPlace,
} from "@/lib/database/schema/saved-discovery";

const identifierSchema = z.uuid();

export type SavedMutationResult =
  | "saved"
  | "already_saved"
  | "removed"
  | "not_found"
  | "invalid"
  | "unavailable";

export type SavedBusinessSummary = {
  id: string;
  slug: string;
  tradingName: string;
  summary: string;
  categoryName: string;
  placeName: string;
  savedAt: Date;
};

export type SavedEventSummary = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  locationDisplay: string | null;
  businessName: string;
  businessSlug: string;
  savedAt: Date;
};

export type SavedOfferSummary = {
  id: string;
  title: string;
  endsAt: Date | null;
  businessName: string;
  businessSlug: string;
  placeName: string;
  savedAt: Date;
  /** The title is the owner's Welsh wording. */
  welshTitle: boolean;
};

export type SavedPlaceSummary = {
  id: string;
  slug: string;
  name: string;
  welshName: string | null;
  editorialSummary: string;
  savedAt: Date;
};

export type SavedDiscoveryResult =
  | {
      state: "ready";
      businesses: SavedBusinessSummary[];
      events: SavedEventSummary[];
      places: SavedPlaceSummary[];
    }
  | { state: "invalid"; businesses: []; events: []; places: [] }
  | { state: "unavailable"; businesses: []; events: []; places: [] };

function parseIdentifiers(userId: string, itemId: string) {
  const parsedUserId = identifierSchema.safeParse(userId);
  const parsedItemId = identifierSchema.safeParse(itemId);
  if (!parsedUserId.success || !parsedItemId.success) return null;
  return { userId: parsedUserId.data, itemId: parsedItemId.data };
}

export async function saveBusinessForUser(
  userId: string,
  businessId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, businessId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .insert(savedBusiness)
      .values({ userId: identifiers.userId, businessId: identifiers.itemId })
      .onConflictDoNothing()
      .returning({ businessId: savedBusiness.businessId });
    return rows.length > 0 ? "saved" : "already_saved";
  } catch {
    return "unavailable";
  }
}

export async function removeBusinessForUser(
  userId: string,
  businessId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, businessId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .delete(savedBusiness)
      .where(
        and(
          eq(savedBusiness.userId, identifiers.userId),
          eq(savedBusiness.businessId, identifiers.itemId),
        ),
      )
      .returning({ businessId: savedBusiness.businessId });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function saveEventForUser(
  userId: string,
  eventId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, eventId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .insert(savedEvent)
      .values({ userId: identifiers.userId, eventId: identifiers.itemId })
      .onConflictDoNothing()
      .returning({ eventId: savedEvent.eventId });
    return rows.length > 0 ? "saved" : "already_saved";
  } catch {
    return "unavailable";
  }
}

export async function removeEventForUser(
  userId: string,
  eventId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, eventId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .delete(savedEvent)
      .where(
        and(
          eq(savedEvent.userId, identifiers.userId),
          eq(savedEvent.eventId, identifiers.itemId),
        ),
      )
      .returning({ eventId: savedEvent.eventId });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function savePlaceForUser(
  userId: string,
  placeId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, placeId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .insert(savedPlace)
      .values({ userId: identifiers.userId, placeId: identifiers.itemId })
      .onConflictDoNothing()
      .returning({ placeId: savedPlace.placeId });
    return rows.length > 0 ? "saved" : "already_saved";
  } catch {
    return "unavailable";
  }
}

export async function removePlaceForUser(
  userId: string,
  placeId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, placeId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .delete(savedPlace)
      .where(
        and(
          eq(savedPlace.userId, identifiers.userId),
          eq(savedPlace.placeId, identifiers.itemId),
        ),
      )
      .returning({ placeId: savedPlace.placeId });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function listSavedBusinessIdsForUser(
  userId: string,
): Promise<string[]> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) return [];

  try {
    const rows = await getDatabase()
      .select({ businessId: savedBusiness.businessId })
      .from(savedBusiness)
      .where(eq(savedBusiness.userId, parsedUserId.data))
      .orderBy(desc(savedBusiness.createdAt));
    return rows.map((row) => row.businessId);
  } catch {
    return [];
  }
}

export async function listSavedEventIdsForUser(
  userId: string,
): Promise<string[]> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) return [];

  try {
    const rows = await getDatabase()
      .select({ eventId: savedEvent.eventId })
      .from(savedEvent)
      .where(eq(savedEvent.userId, parsedUserId.data))
      .orderBy(desc(savedEvent.createdAt));
    return rows.map((row) => row.eventId);
  } catch {
    return [];
  }
}

export async function listSavedPlaceIdsForUser(
  userId: string,
): Promise<string[]> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) return [];

  try {
    const rows = await getDatabase()
      .select({ placeId: savedPlace.placeId })
      .from(savedPlace)
      .where(eq(savedPlace.userId, parsedUserId.data))
      .orderBy(desc(savedPlace.createdAt));
    return rows.map((row) => row.placeId);
  } catch {
    return [];
  }
}

export async function listSavedDiscoveryForUser(
  userId: string,
  now: Date = new Date(),
): Promise<SavedDiscoveryResult> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return { state: "invalid", businesses: [], events: [], places: [] };
  }

  try {
    const database = getDatabase();
    const [businesses, events, places] = await Promise.all([
      database
        .select({
          id: business.id,
          slug: business.slug,
          tradingName: business.tradingName,
          summary: business.summary,
          categoryName: category.name,
          placeName: place.canonicalName,
          savedAt: savedBusiness.createdAt,
        })
        .from(savedBusiness)
        .innerJoin(business, eq(business.id, savedBusiness.businessId))
        .innerJoin(
          businessPublication,
          eq(businessPublication.businessId, business.id),
        )
        .innerJoin(
          businessSite,
          and(
            eq(businessSite.id, businessPublication.businessSiteId),
            eq(businessSite.businessId, business.id),
          ),
        )
        .innerJoin(category, eq(category.id, business.primaryCategoryId))
        .innerJoin(
          businessLocation,
          and(
            eq(businessLocation.businessId, business.id),
            eq(businessLocation.isPrimary, true),
            eq(businessLocation.status, "active"),
          ),
        )
        .innerJoin(place, eq(place.id, businessLocation.placeId))
        .where(
          and(
            eq(savedBusiness.userId, parsedUserId.data),
            eq(business.status, "published"),
            eq(businessPublication.status, "published"),
            isNotNull(businessPublication.publishedAt),
            eq(businessSite.status, "published"),
            isNotNull(businessSite.publishedAt),
            eq(category.status, "active"),
            eq(place.status, "active"),
          ),
        )
        .orderBy(desc(savedBusiness.createdAt)),
      database
        .select({
          id: businessEvent.id,
          title: businessEvent.title,
          startsAt: businessEvent.startsAt,
          endsAt: businessEvent.endsAt,
          locationDisplay: businessEvent.locationDisplay,
          businessName: business.tradingName,
          businessSlug: business.slug,
          savedAt: savedEvent.createdAt,
        })
        .from(savedEvent)
        .innerJoin(businessEvent, eq(businessEvent.id, savedEvent.eventId))
        .innerJoin(business, eq(business.id, businessEvent.businessId))
        .where(
          and(
            eq(savedEvent.userId, parsedUserId.data),
            eq(business.status, "published"),
            eq(businessEvent.status, "active"),
            or(
              and(
                isNull(businessEvent.endsAt),
                gte(businessEvent.startsAt, now),
              ),
              gte(businessEvent.endsAt, now),
            ),
          ),
        )
        .orderBy(asc(businessEvent.startsAt)),
      database
        .select({
          id: place.id,
          slug: place.slug,
          name: place.canonicalName,
          welshName: place.welshName,
          editorialSummary: place.editorialSummary,
          savedAt: savedPlace.createdAt,
        })
        .from(savedPlace)
        .innerJoin(place, eq(place.id, savedPlace.placeId))
        .where(
          and(
            eq(savedPlace.userId, parsedUserId.data),
            eq(place.status, "active"),
          ),
        )
        .orderBy(desc(savedPlace.createdAt)),
    ]);

    return { state: "ready", businesses, events, places };
  } catch {
    return { state: "unavailable", businesses: [], events: [], places: [] };
  }
}

/** The most offers one person can keep; far above any real use, so the page stays a page. */
export const MAX_SAVED_OFFERS = 200;

const liveOfferCondition = (now: Date) =>
  and(
    eq(business.status, "published"),
    eq(businessOffer.status, "active"),
    or(isNull(businessOffer.startsAt), lte(businessOffer.startsAt, now)),
    or(isNull(businessOffer.endsAt), gte(businessOffer.endsAt, now)),
  );

/**
 * Keeps a live offer for the person. Only an offer that is live now can be
 * saved, so a draft, paused or ended offer reads as "not found" and nothing
 * about it is revealed; the count is capped so one account cannot grow without bound.
 */
export async function saveOfferForUser(
  userId: string,
  offerId: string,
  now: Date = new Date(),
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, offerId);
  if (!identifiers) return "invalid";

  try {
    const database = getDatabase();
    const [live] = await database
      .select({ id: businessOffer.id })
      .from(businessOffer)
      .innerJoin(business, eq(business.id, businessOffer.businessId))
      .where(
        and(eq(businessOffer.id, identifiers.itemId), liveOfferCondition(now)),
      )
      .limit(1);
    if (!live) return "not_found";

    // Only live saves count: an offer that ended or was taken down no
    // longer shows in the list, so it must not hold a slot the person
    // cannot see or free.
    const kept = await database
      .select({ offerId: savedOffer.offerId })
      .from(savedOffer)
      .innerJoin(businessOffer, eq(businessOffer.id, savedOffer.offerId))
      .innerJoin(business, eq(business.id, businessOffer.businessId))
      .where(
        and(eq(savedOffer.userId, identifiers.userId), liveOfferCondition(now)),
      )
      .limit(MAX_SAVED_OFFERS + 1);
    if (
      kept.length > MAX_SAVED_OFFERS &&
      !kept.some((row) => row.offerId === identifiers.itemId)
    ) {
      return "unavailable";
    }

    const rows = await database
      .insert(savedOffer)
      .values({ userId: identifiers.userId, offerId: identifiers.itemId })
      .onConflictDoNothing()
      .returning({ offerId: savedOffer.offerId });
    return rows.length > 0 ? "saved" : "already_saved";
  } catch {
    return "unavailable";
  }
}

export async function removeOfferForUser(
  userId: string,
  offerId: string,
): Promise<SavedMutationResult> {
  const identifiers = parseIdentifiers(userId, offerId);
  if (!identifiers) return "invalid";

  try {
    const rows = await getDatabase()
      .delete(savedOffer)
      .where(
        and(
          eq(savedOffer.userId, identifiers.userId),
          eq(savedOffer.offerId, identifiers.itemId),
        ),
      )
      .returning({ offerId: savedOffer.offerId });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function listSavedOfferIdsForUser(
  userId: string,
): Promise<string[]> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) return [];

  try {
    const rows = await getDatabase()
      .select({ offerId: savedOffer.offerId })
      .from(savedOffer)
      .where(eq(savedOffer.userId, parsedUserId.data))
      .orderBy(desc(savedOffer.createdAt))
      .limit(MAX_SAVED_OFFERS);
    return rows.map((row) => row.offerId);
  } catch {
    return [];
  }
}

/**
 * The person's saved offers that are still live, soonest-ending first with
 * open-ended ones last. An offer that has ended or been taken down is
 * left out here (it stays saved and returns if it is switched back on).
 */
export async function listSavedOffersForUser(
  userId: string,
  locale: "en" | "cy" = "en",
  now: Date = new Date(),
): Promise<SavedOfferSummary[]> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) return [];

  const rows = await getDatabase()
    .select({
      id: businessOffer.id,
      title: businessOffer.title,
      welshTitle: offerTranslation.title,
      endsAt: businessOffer.endsAt,
      businessName: business.tradingName,
      businessSlug: business.slug,
      placeName: place.canonicalName,
      savedAt: savedOffer.createdAt,
    })
    .from(savedOffer)
    .innerJoin(businessOffer, eq(businessOffer.id, savedOffer.offerId))
    .leftJoin(
      offerTranslation,
      and(
        eq(offerTranslation.offerId, businessOffer.id),
        eq(offerTranslation.locale, "cy"),
      ),
    )
    .innerJoin(business, eq(business.id, businessOffer.businessId))
    .innerJoin(
      businessLocation,
      and(
        eq(businessLocation.businessId, business.id),
        eq(businessLocation.isPrimary, true),
        eq(businessLocation.status, "active"),
      ),
    )
    .innerJoin(place, eq(place.id, businessLocation.placeId))
    .where(
      and(eq(savedOffer.userId, parsedUserId.data), liveOfferCondition(now)),
    )
    .orderBy(
      sql`${businessOffer.endsAt} asc nulls last`,
      desc(savedOffer.createdAt),
    )
    .limit(MAX_SAVED_OFFERS);

  return rows.map(({ welshTitle, title, ...row }) => ({
    ...row,
    title: (locale === "cy" && welshTitle) || title,
    welshTitle: locale === "cy" && !!welshTitle,
  }));
}
