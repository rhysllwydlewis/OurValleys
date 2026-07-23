import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  or,
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
import { businessEvent } from "@/lib/database/schema/business-operations";
import {
  savedBusiness,
  savedEvent,
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

export type SavedDiscoveryResult =
  | {
      state: "ready";
      businesses: SavedBusinessSummary[];
      events: SavedEventSummary[];
    }
  | { state: "invalid"; businesses: []; events: [] }
  | { state: "unavailable"; businesses: []; events: [] };

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

export async function listSavedDiscoveryForUser(
  userId: string,
): Promise<SavedDiscoveryResult> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return { state: "invalid", businesses: [], events: [] };
  }

  try {
    const database = getDatabase();
    const now = new Date();
    const [businesses, events] = await Promise.all([
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
    ]);

    return { state: "ready", businesses, events };
  } catch {
    return { state: "unavailable", businesses: [], events: [] };
  }
}
