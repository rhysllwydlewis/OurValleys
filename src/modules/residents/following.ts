import "server-only";
import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  place,
} from "@/lib/database/schema/business";
import {
  businessEvent,
  businessOffer,
  businessUpdate,
} from "@/lib/database/schema/business-operations";
import { savedBusiness } from "@/lib/database/schema/saved-discovery";
import {
  FOLLOW_FEED_DAYS,
  FOLLOW_FEED_LIMIT,
  type FollowItemKind,
} from "./following-model";

const identifierSchema = z.uuid();

export type FollowedBusiness = {
  id: string;
  slug: string;
  tradingName: string;
  placeName: string | null;
  notify: boolean;
};

export type FollowFeedItem = {
  kind: FollowItemKind;
  id: string;
  title: string;
  /** Plain-text start of the body or description, for a one-line preview. */
  excerpt: string;
  at: Date;
  startsAt: Date | null;
  businessName: string;
  businessSlug: string;
  fictional: boolean;
};

export type FollowingOverview =
  | { state: "ready"; businesses: FollowedBusiness[]; feed: FollowFeedItem[] }
  | { state: "unavailable" };

export type SetNotifyResult = "done" | "not_found" | "invalid" | "unavailable";

const EXCERPT_LENGTH = 140;

function excerpt(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > EXCERPT_LENGTH
    ? `${clean.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…`
    : clean;
}

/** Turns notices on or off for one business this person saved. Own rows only. */
export async function setSavedBusinessNotify(
  userId: string,
  businessId: string,
  notify: boolean,
): Promise<SetNotifyResult> {
  const user = identifierSchema.safeParse(userId);
  const target = identifierSchema.safeParse(businessId);
  if (!user.success || !target.success) return "invalid";
  try {
    const updated = await getDatabase()
      .update(savedBusiness)
      .set({ notify })
      .where(
        and(
          eq(savedBusiness.userId, user.data),
          eq(savedBusiness.businessId, target.data),
        ),
      )
      .returning({ businessId: savedBusiness.businessId });
    return updated.length > 0 ? "done" : "not_found";
  } catch {
    return "unavailable";
  }
}

/** Turns notices on or off for every saved business at once. */
export async function setAllSavedBusinessNotify(
  userId: string,
  notify: boolean,
): Promise<SetNotifyResult> {
  const user = identifierSchema.safeParse(userId);
  if (!user.success) return "invalid";
  try {
    await getDatabase()
      .update(savedBusiness)
      .set({ notify })
      .where(eq(savedBusiness.userId, user.data));
    return "done";
  } catch {
    return "unavailable";
  }
}

/**
 * The saved businesses with their notice switch, and the newest updates,
 * offers and events they published lately. Reads only public, published
 * content of businesses this person saved.
 */
export async function loadFollowingOverview(
  userId: string,
  now = new Date(),
): Promise<FollowingOverview> {
  const parsed = identifierSchema.safeParse(userId);
  if (!parsed.success) return { state: "unavailable" };
  try {
    const database = getDatabase();
    const since = new Date(now.getTime() - FOLLOW_FEED_DAYS * 86_400_000);
    const visible = and(
      eq(savedBusiness.userId, parsed.data),
      eq(business.status, "published"),
      isNull(business.suspendedAt),
    );

    const [businesses, updates, offers, events] = await Promise.all([
      database
        .select({
          id: business.id,
          slug: business.slug,
          tradingName: business.tradingName,
          placeName: place.canonicalName,
          notify: savedBusiness.notify,
        })
        .from(savedBusiness)
        .innerJoin(business, eq(business.id, savedBusiness.businessId))
        .leftJoin(
          businessLocation,
          and(
            eq(businessLocation.businessId, business.id),
            eq(businessLocation.isPrimary, true),
          ),
        )
        .leftJoin(place, eq(place.id, businessLocation.placeId))
        .where(visible)
        .orderBy(business.tradingName)
        .limit(200),
      database
        .select({
          id: businessUpdate.id,
          title: businessUpdate.title,
          body: businessUpdate.body,
          at: businessUpdate.publishedAt,
          businessName: business.tradingName,
          businessSlug: business.slug,
          fictional: business.isDemo,
        })
        .from(savedBusiness)
        .innerJoin(business, eq(business.id, savedBusiness.businessId))
        .innerJoin(businessUpdate, eq(businessUpdate.businessId, business.id))
        .where(
          and(
            visible,
            eq(businessUpdate.status, "published"),
            gt(businessUpdate.publishedAt, since),
          ),
        )
        .orderBy(desc(businessUpdate.publishedAt))
        .limit(FOLLOW_FEED_LIMIT),
      database
        .select({
          id: businessOffer.id,
          title: businessOffer.title,
          description: businessOffer.description,
          at: businessOffer.createdAt,
          businessName: business.tradingName,
          businessSlug: business.slug,
          fictional: business.isDemo,
        })
        .from(savedBusiness)
        .innerJoin(business, eq(business.id, savedBusiness.businessId))
        .innerJoin(businessOffer, eq(businessOffer.businessId, business.id))
        .where(
          and(
            visible,
            eq(businessOffer.status, "active"),
            gt(businessOffer.createdAt, since),
            or(
              isNull(businessOffer.startsAt),
              lte(businessOffer.startsAt, now),
            ),
            or(isNull(businessOffer.endsAt), gt(businessOffer.endsAt, now)),
          ),
        )
        .orderBy(desc(businessOffer.createdAt))
        .limit(FOLLOW_FEED_LIMIT),
      database
        .select({
          id: businessEvent.id,
          title: businessEvent.title,
          description: businessEvent.description,
          at: businessEvent.createdAt,
          startsAt: businessEvent.startsAt,
          businessName: business.tradingName,
          businessSlug: business.slug,
          fictional: business.isDemo,
        })
        .from(savedBusiness)
        .innerJoin(business, eq(business.id, savedBusiness.businessId))
        .innerJoin(businessEvent, eq(businessEvent.businessId, business.id))
        .where(
          and(
            visible,
            eq(businessEvent.status, "active"),
            gt(businessEvent.createdAt, since),
            or(
              and(
                isNull(businessEvent.endsAt),
                gt(businessEvent.startsAt, now),
              ),
              gt(businessEvent.endsAt, now),
            ),
          ),
        )
        .orderBy(desc(businessEvent.createdAt))
        .limit(FOLLOW_FEED_LIMIT),
    ]);

    const feed: FollowFeedItem[] = [
      ...updates.flatMap((row) =>
        row.at
          ? [
              {
                kind: "update" as const,
                id: row.id,
                title: row.title,
                excerpt: excerpt(row.body),
                at: row.at,
                startsAt: null,
                businessName: row.businessName,
                businessSlug: row.businessSlug,
                fictional: row.fictional,
              },
            ]
          : [],
      ),
      ...offers.map((row) => ({
        kind: "offer" as const,
        id: row.id,
        title: row.title,
        excerpt: excerpt(row.description),
        at: row.at,
        startsAt: null,
        businessName: row.businessName,
        businessSlug: row.businessSlug,
        fictional: row.fictional,
      })),
      ...events.map((row) => ({
        kind: "event" as const,
        id: row.id,
        title: row.title,
        excerpt: excerpt(row.description),
        at: row.at,
        startsAt: row.startsAt,
        businessName: row.businessName,
        businessSlug: row.businessSlug,
        fictional: row.fictional,
      })),
    ]
      .sort(
        (a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id),
      )
      .slice(0, FOLLOW_FEED_LIMIT);

    return { state: "ready", businesses, feed };
  } catch {
    return { state: "unavailable" };
  }
}
