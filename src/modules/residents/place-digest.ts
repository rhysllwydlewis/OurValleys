import "server-only";
import { and, asc, desc, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  businessPublication,
  place,
} from "@/lib/database/schema/business";
import {
  businessEvent,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import { savedBusiness } from "@/lib/database/schema/saved-discovery";
import { sendTransactionalEmail } from "@/lib/email";
import { buildUnsubscribeUrl } from "@/lib/notification-unsubscribe";
import { getSiteUrl } from "@/lib/site";
import { savedPlaceScopeCondition } from "./saved-place-scope";

const DAY_MS = 86_400_000;

/** Weekly cadence: a recipient is never mailed twice inside this window. */
export const DIGEST_MIN_INTERVAL_DAYS = 6;
/** First digest, or a long gap, looks back this far at most. */
export const DIGEST_LOOKBACK_DAYS = 7;
export const DIGEST_MAX_LOOKBACK_DAYS = 14;
/**
 * Republishing resets a business's published_at, so only businesses created
 * recently count as "new" — an established business editing its page is not.
 */
export const DIGEST_NEW_BUSINESS_MAX_AGE_DAYS = 60;
const MAX_ITEMS_PER_SECTION = 5;

export type DigestBusiness = {
  name: string;
  slug: string;
  placeName: string;
};

export type DigestEvent = {
  id: string;
  title: string;
  businessName: string;
  placeName: string;
  startsAt: Date;
};

/** A new offer from a business the resident saved. */
export type DigestSavedOffer = {
  id: string;
  title: string;
  businessName: string;
  businessSlug: string;
};

/** A new event from a business the resident saved. */
export type DigestSavedEvent = {
  id: string;
  title: string;
  businessName: string;
  startsAt: Date;
};

export type PlaceDigestContent = {
  businesses: DigestBusiness[];
  events: DigestEvent[];
  savedOffers: DigestSavedOffer[];
  savedEvents: DigestSavedEvent[];
};

/**
 * The look-back start for one recipient: since their last digest, but never
 * further back than the maximum look-back, and a week when they have none.
 */
export function resolveDigestSince(lastSentAt: Date | null, now: Date): Date {
  const earliest = new Date(now.getTime() - DIGEST_MAX_LOOKBACK_DAYS * DAY_MS);
  if (!lastSentAt) {
    return new Date(now.getTime() - DIGEST_LOOKBACK_DAYS * DAY_MS);
  }
  return lastSentAt > earliest ? lastSentAt : earliest;
}

export function isDigestContentEmpty(content: PlaceDigestContent): boolean {
  return (
    content.businesses.length === 0 &&
    content.events.length === 0 &&
    content.savedOffers.length === 0 &&
    content.savedEvents.length === 0
  );
}

const eventDateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/London",
});

/**
 * Plain-text body only: no enquiry data or personal details, just public
 * listing names and links plus the one-click unsubscribe link.
 */
export function composePlaceDigestEmail(
  content: PlaceDigestContent,
  unsubscribeUrl: string,
  siteUrl: URL = getSiteUrl(),
): { subject: string; text: string } {
  const link = (path: string) => new URL(path, siteUrl).toString();
  const lines: string[] = [
    "New from the places and businesses you saved on OurValleys.",
    "",
  ];

  if (content.businesses.length > 0) {
    lines.push("New local businesses");
    for (const item of content.businesses) {
      lines.push(
        `- ${item.name} (${item.placeName}): ${link(`/b/${item.slug}`)}`,
      );
    }
    lines.push("");
  }

  if (content.events.length > 0) {
    lines.push("New events");
    for (const item of content.events) {
      lines.push(
        `- ${item.title}, ${eventDateFormat.format(item.startsAt)} — ${item.businessName} (${item.placeName}): ${link(`/events/${item.id}`)}`,
      );
    }
    lines.push("");
  }

  if (content.savedOffers.length > 0 || content.savedEvents.length > 0) {
    lines.push("From businesses you saved");
    for (const item of content.savedOffers) {
      lines.push(
        `- Offer: ${item.title} — ${item.businessName}: ${link(`/b/${item.businessSlug}`)}`,
      );
    }
    for (const item of content.savedEvents) {
      lines.push(
        `- Event: ${item.title}, ${eventDateFormat.format(item.startsAt)} — ${item.businessName}: ${link(`/events/${item.id}`)}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "You are receiving this because you turned on the saved-place digest in your account settings.",
    `Stop these emails: ${unsubscribeUrl}`,
  );

  const total =
    content.businesses.length +
    content.events.length +
    content.savedOffers.length +
    content.savedEvents.length;
  return {
    subject:
      total === 1
        ? "1 new thing from your saved places and businesses"
        : `${total} new things from your saved places and businesses`,
    text: lines.join("\n"),
  };
}

export async function loadPlaceDigestContent(
  userId: string,
  since: Date,
  now: Date,
): Promise<PlaceDigestContent> {
  const database = getDatabase();
  const newBusinessCutoff = new Date(
    now.getTime() - DIGEST_NEW_BUSINESS_MAX_AGE_DAYS * DAY_MS,
  );

  const businesses = await database
    .select({
      name: business.tradingName,
      slug: business.slug,
      placeName: place.canonicalName,
    })
    .from(businessLocation)
    .innerJoin(place, eq(place.id, businessLocation.placeId))
    .innerJoin(business, eq(business.id, businessLocation.businessId))
    .innerJoin(
      businessPublication,
      and(
        eq(businessPublication.businessId, business.id),
        eq(businessPublication.status, "published"),
      ),
    )
    .where(
      and(
        savedPlaceScopeCondition(businessLocation.placeId, userId),
        eq(businessLocation.isPrimary, true),
        eq(businessLocation.status, "active"),
        eq(place.status, "active"),
        eq(business.status, "published"),
        eq(business.isDemo, false),
        isNull(business.suspendedAt),
        gte(business.createdAt, newBusinessCutoff),
        gte(businessPublication.publishedAt, since),
        lt(businessPublication.publishedAt, now),
      ),
    )
    .orderBy(desc(businessPublication.publishedAt))
    .limit(MAX_ITEMS_PER_SECTION);

  const events = await database
    .select({
      id: businessEvent.id,
      title: businessEvent.title,
      businessName: business.tradingName,
      placeName: place.canonicalName,
      startsAt: businessEvent.startsAt,
    })
    .from(businessLocation)
    .innerJoin(place, eq(place.id, businessLocation.placeId))
    .innerJoin(business, eq(business.id, businessLocation.businessId))
    .innerJoin(businessEvent, eq(businessEvent.businessId, business.id))
    .where(
      and(
        savedPlaceScopeCondition(businessLocation.placeId, userId),
        eq(businessLocation.isPrimary, true),
        eq(businessLocation.status, "active"),
        eq(place.status, "active"),
        eq(business.status, "published"),
        eq(business.isDemo, false),
        isNull(business.suspendedAt),
        eq(businessEvent.status, "active"),
        gte(businessEvent.createdAt, since),
        lt(businessEvent.createdAt, now),
        or(
          and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
          gte(businessEvent.endsAt, now),
        ),
      ),
    )
    .orderBy(asc(businessEvent.startsAt))
    .limit(MAX_ITEMS_PER_SECTION);

  // Over-fetch so de-duplicating against the saved-place events below still
  // leaves a full section.
  const savedEventRows = await database
    .select({
      id: businessEvent.id,
      title: businessEvent.title,
      businessName: business.tradingName,
      startsAt: businessEvent.startsAt,
    })
    .from(savedBusiness)
    .innerJoin(business, eq(business.id, savedBusiness.businessId))
    .innerJoin(businessEvent, eq(businessEvent.businessId, business.id))
    .where(
      and(
        eq(savedBusiness.userId, userId),
        eq(business.status, "published"),
        eq(business.isDemo, false),
        isNull(business.suspendedAt),
        eq(businessEvent.status, "active"),
        gte(businessEvent.createdAt, since),
        lt(businessEvent.createdAt, now),
        or(
          and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
          gte(businessEvent.endsAt, now),
        ),
      ),
    )
    .orderBy(asc(businessEvent.startsAt))
    .limit(MAX_ITEMS_PER_SECTION * 2);
  const placeEventIds = new Set(events.map((item) => item.id));
  const savedEvents = savedEventRows
    .filter((item) => !placeEventIds.has(item.id))
    .slice(0, MAX_ITEMS_PER_SECTION);

  const savedOffers = await database
    .select({
      id: businessOffer.id,
      title: businessOffer.title,
      businessName: business.tradingName,
      businessSlug: business.slug,
    })
    .from(savedBusiness)
    .innerJoin(business, eq(business.id, savedBusiness.businessId))
    .innerJoin(businessOffer, eq(businessOffer.businessId, business.id))
    .where(
      and(
        eq(savedBusiness.userId, userId),
        eq(business.status, "published"),
        eq(business.isDemo, false),
        isNull(business.suspendedAt),
        eq(businessOffer.status, "active"),
        gte(businessOffer.createdAt, since),
        lt(businessOffer.createdAt, now),
        or(isNull(businessOffer.startsAt), lte(businessOffer.startsAt, now)),
        or(isNull(businessOffer.endsAt), gte(businessOffer.endsAt, now)),
      ),
    )
    .orderBy(desc(businessOffer.createdAt))
    .limit(MAX_ITEMS_PER_SECTION);

  return { businesses, events, savedOffers, savedEvents };
}

export type PlaceDigestResult = {
  recipients: number;
  sent: number;
  skippedEmpty: number;
  failed: number;
};

/**
 * Sends the weekly saved-place digest (opt-in), which also covers new offers
 * and events from saved businesses. Designed for a weekly worker
 * schedule and safe to run repeatedly: recipients mailed within the minimum
 * interval are skipped, and the sent timestamp only advances after delivery
 * succeeds so a failed send is retried next run with the same look-back.
 * A recipient with nothing new is not mailed and not advanced.
 */
export async function runPlaceDigest(
  now = new Date(),
): Promise<PlaceDigestResult> {
  const database = getDatabase();
  const dueBefore = new Date(now.getTime() - DIGEST_MIN_INTERVAL_DAYS * DAY_MS);
  const result: PlaceDigestResult = {
    recipients: 0,
    sent: 0,
    skippedEmpty: 0,
    failed: 0,
  };

  const recipients = await database
    .select({
      id: user.id,
      email: user.email,
      lastSentAt: user.savedPlaceDigestSentAt,
    })
    .from(user)
    .where(
      and(
        eq(user.savedPlaceDigestEmails, true),
        eq(user.emailVerified, true),
        eq(user.banned, false),
        or(
          isNull(user.savedPlaceDigestSentAt),
          lt(user.savedPlaceDigestSentAt, dueBefore),
        ),
      ),
    );
  result.recipients = recipients.length;

  for (const recipient of recipients) {
    try {
      const content = await loadPlaceDigestContent(
        recipient.id,
        resolveDigestSince(recipient.lastSentAt, now),
        now,
      );
      if (isDigestContentEmpty(content)) {
        result.skippedEmpty += 1;
        continue;
      }
      const message = composePlaceDigestEmail(
        content,
        buildUnsubscribeUrl("saved_place_digest", recipient.id),
      );
      await sendTransactionalEmail({
        category: "place_digest",
        to: recipient.email,
        ...message,
      });
      await database
        .update(user)
        .set({ savedPlaceDigestSentAt: now })
        .where(eq(user.id, recipient.id));
      result.sent += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
