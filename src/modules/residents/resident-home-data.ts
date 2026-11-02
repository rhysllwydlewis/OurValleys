import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, businessLocation } from "@/lib/database/schema/business";
import {
  businessEvent,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import {
  savedBusiness,
  savedEvent,
} from "@/lib/database/schema/saved-discovery";
import { placeScopeCondition } from "@/modules/reference-data/place-scope";
import { savedPlaceScopeCondition } from "./saved-place-scope";
import {
  loadPlaceDigestContent,
  type PlaceDigestContent,
} from "./place-digest";
import {
  mergeComingUp,
  RESIDENT_COMING_UP_DAYS,
  type ComingUpEvent,
  type SavedCounts,
} from "./resident-home";
import {
  listSavedDiscoveryForUser,
  listSavedOffersForUser,
  type SavedOfferSummary,
  type SavedBusinessSummary,
  type SavedEventSummary,
  type SavedPlaceSummary,
} from "./saved-discovery";

const DAY_MS = 86_400_000;
const MAX_COMING_UP = 12;
const MAX_PLACES_WITH_COUNTS = 12;
const PLACE_COUNT_BATCH = 4;
const WHATS_NEW_DAYS = 14;
const identifierSchema = z.uuid();

export type ResidentOffer = {
  id: string;
  title: string;
  endsAt: Date | null;
};

export type ResidentBusiness = SavedBusinessSummary & {
  /** The soonest-ending live offer, if the business has one. */
  offer: ResidentOffer | null;
  /** Null when the count could not be read (see `unavailable`). */
  upcomingEventCount: number | null;
};

/** Counts are null for places past the cap, which are listed but not counted. */
export type ResidentPlace = SavedPlaceSummary & {
  businessCount: number | null;
  upcomingEventCount: number | null;
};

export type ResidentPreferences = {
  digestOn: boolean;
  remindersOn: boolean;
};

export type ResidentHome =
  | { state: "invalid" }
  | {
      state: "ready";
      counts: SavedCounts;
      comingUp: ComingUpEvent[];
      /** More events qualify than the diary shows. */
      comingUpTruncated: boolean;
      businesses: ResidentBusiness[];
      /** Saved events that have not finished yet (past ones drop away). */
      savedEvents: SavedEventSummary[];
      places: ResidentPlace[];
      /** Public additions in the resident's saved places and businesses. */
      whatsNew: PlaceDigestContent | null;
      /** Null when the preference read failed; never guessed as "off". */
      preferences: ResidentPreferences | null;
      /** Sources that could not be read; the page says so rather than hiding it. */
      unavailable: (
        | "saved"
        | "comingUp"
        | "whatsNew"
        | "places"
        | "businesses"
        | "preferences"
      )[];
    };

function liveEventFilter(now: Date, horizon: Date) {
  return and(
    eq(businessEvent.status, "active"),
    eq(business.status, "published"),
    isNull(business.suspendedAt),
    lt(businessEvent.startsAt, horizon),
    or(
      and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
      gte(businessEvent.endsAt, now),
    ),
  );
}

const comingUpColumns = {
  id: businessEvent.id,
  title: businessEvent.title,
  startsAt: businessEvent.startsAt,
  endsAt: businessEvent.endsAt,
  locationDisplay: businessEvent.locationDisplay,
  businessName: business.tradingName,
  businessSlug: business.slug,
};

/**
 * Upcoming events the resident asked for: saved directly, from a saved
 * business, or inside a saved place (a saved valley includes its towns).
 * Each event appears once under its strongest reason.
 */
export type ComingUp = { events: ComingUpEvent[]; truncated: boolean };

export async function listComingUpForUser(
  userId: string,
  now: Date,
): Promise<ComingUp> {
  const parsed = identifierSchema.safeParse(userId);
  if (!parsed.success) return { events: [], truncated: false };
  const database = getDatabase();
  const horizon = new Date(now.getTime() + RESIDENT_COMING_UP_DAYS * DAY_MS);
  const filter = liveEventFilter(now, horizon);

  const [direct, fromBusinesses, fromPlaces] = await Promise.all([
    database
      .select(comingUpColumns)
      .from(savedEvent)
      .innerJoin(businessEvent, eq(businessEvent.id, savedEvent.eventId))
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .where(and(eq(savedEvent.userId, parsed.data), filter))
      .orderBy(asc(businessEvent.startsAt))
      .limit(MAX_COMING_UP * 2),
    database
      .select(comingUpColumns)
      .from(savedBusiness)
      .innerJoin(business, eq(business.id, savedBusiness.businessId))
      .innerJoin(businessEvent, eq(businessEvent.businessId, business.id))
      .where(and(eq(savedBusiness.userId, parsed.data), filter))
      .orderBy(asc(businessEvent.startsAt))
      .limit(MAX_COMING_UP * 2),
    database
      .select(comingUpColumns)
      .from(businessEvent)
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .innerJoin(
        businessLocation,
        and(
          eq(businessLocation.businessId, business.id),
          eq(businessLocation.isPrimary, true),
          eq(businessLocation.status, "active"),
        ),
      )
      .where(
        and(
          filter,
          eq(business.isDemo, false),
          savedPlaceScopeCondition(businessLocation.placeId, parsed.data),
        ),
      )
      .orderBy(asc(businessEvent.startsAt))
      .limit(MAX_COMING_UP * 2),
  ]);

  const tag = (rows: typeof direct, source: ComingUpEvent["source"]) =>
    rows.map((row) => ({ ...row, source }));
  const merged = mergeComingUp([
    tag(direct, "saved"),
    tag(fromBusinesses, "business"),
    tag(fromPlaces, "place"),
  ]);
  return {
    events: merged.slice(0, MAX_COMING_UP),
    truncated: merged.length > MAX_COMING_UP,
  };
}

/** The live offer and upcoming-event count for each saved business. */
async function decorateBusinesses(
  businesses: SavedBusinessSummary[],
  now: Date,
): Promise<ResidentBusiness[]> {
  if (businesses.length === 0) return [];
  const database = getDatabase();
  const ids = businesses.map((item) => item.id);
  const [offers, eventCounts] = await Promise.all([
    database
      .select({
        id: businessOffer.id,
        businessId: businessOffer.businessId,
        title: businessOffer.title,
        endsAt: businessOffer.endsAt,
      })
      .from(businessOffer)
      .where(
        and(
          inArray(businessOffer.businessId, ids),
          eq(businessOffer.status, "active"),
          or(isNull(businessOffer.startsAt), lte(businessOffer.startsAt, now)),
          or(isNull(businessOffer.endsAt), gte(businessOffer.endsAt, now)),
        ),
      )
      .orderBy(
        sql`${businessOffer.endsAt} asc nulls last`,
        desc(businessOffer.createdAt),
      ),
    database
      .select({ businessId: businessEvent.businessId, total: count() })
      .from(businessEvent)
      .where(
        and(
          inArray(businessEvent.businessId, ids),
          eq(businessEvent.status, "active"),
          or(
            and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
            gte(businessEvent.endsAt, now),
          ),
        ),
      )
      .groupBy(businessEvent.businessId),
  ]);
  const offerByBusiness = new Map<string, ResidentOffer>();
  for (const offer of offers) {
    if (!offerByBusiness.has(offer.businessId)) {
      offerByBusiness.set(offer.businessId, {
        id: offer.id,
        title: offer.title,
        endsAt: offer.endsAt,
      });
    }
  }
  const eventsByBusiness = new Map(
    eventCounts.map((row) => [row.businessId, row.total]),
  );
  return businesses.map((item) => ({
    ...item,
    offer: offerByBusiness.get(item.id) ?? null,
    upcomingEventCount: eventsByBusiness.get(item.id) ?? 0,
  }));
}

/**
 * Businesses and upcoming events inside each saved place (whole-place scope).
 * Only the first few places are counted, in small batches, to bound the
 * queries one page view can run; the rest are still listed, without counts.
 */
async function decoratePlaces(
  places: SavedPlaceSummary[],
  now: Date,
): Promise<ResidentPlace[]> {
  const database = getDatabase();
  const horizon = new Date(now.getTime() + RESIDENT_COMING_UP_DAYS * DAY_MS);
  const countOne = async (item: SavedPlaceSummary): Promise<ResidentPlace> => {
    const [businesses, events] = await Promise.all([
      database
        .select({ total: count(sql`distinct ${business.id}`) })
        .from(businessLocation)
        .innerJoin(business, eq(business.id, businessLocation.businessId))
        .where(
          and(
            eq(businessLocation.isPrimary, true),
            eq(businessLocation.status, "active"),
            eq(business.status, "published"),
            eq(business.isDemo, false),
            isNull(business.suspendedAt),
            placeScopeCondition(businessLocation.placeId, item.slug),
          ),
        ),
      database
        .select({ total: count(sql`distinct ${businessEvent.id}`) })
        .from(businessEvent)
        .innerJoin(business, eq(business.id, businessEvent.businessId))
        .innerJoin(
          businessLocation,
          and(
            eq(businessLocation.businessId, business.id),
            eq(businessLocation.isPrimary, true),
            eq(businessLocation.status, "active"),
          ),
        )
        .where(
          and(
            liveEventFilter(now, horizon),
            eq(business.isDemo, false),
            placeScopeCondition(businessLocation.placeId, item.slug),
          ),
        ),
    ]);
    return {
      ...item,
      businessCount: businesses[0]?.total ?? 0,
      upcomingEventCount: events[0]?.total ?? 0,
    };
  };

  const counted: ResidentPlace[] = [];
  const head = places.slice(0, MAX_PLACES_WITH_COUNTS);
  for (let index = 0; index < head.length; index += PLACE_COUNT_BATCH) {
    counted.push(
      ...(await Promise.all(
        head.slice(index, index + PLACE_COUNT_BATCH).map(countOne),
      )),
    );
  }
  const rest = places.slice(MAX_PLACES_WITH_COUNTS).map((item) => ({
    ...item,
    businessCount: null,
    upcomingEventCount: null,
  }));
  return [...counted, ...rest];
}

async function readPreferences(userId: string): Promise<ResidentPreferences> {
  const [row] = await getDatabase()
    .select({
      digestOn: user.savedPlaceDigestEmails,
      remindersOn: user.savedEventReminderEmails,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? { digestOn: false, remindersOn: false };
}

async function attempt<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

/**
 * Everything the resident home shows, read-only and scoped to one user id
 * taken from the verified session. A source that fails is reported in
 * `unavailable` and the rest of the page still renders.
 */
export async function loadResidentHome(
  userId: string,
  now: Date = new Date(),
): Promise<ResidentHome> {
  const parsed = identifierSchema.safeParse(userId);
  if (!parsed.success) return { state: "invalid" };

  const [saved, comingUp, whatsNew, preferences] = await Promise.all([
    listSavedDiscoveryForUser(parsed.data, now),
    attempt(() => listComingUpForUser(parsed.data, now)),
    attempt(() =>
      loadPlaceDigestContent(
        parsed.data,
        new Date(now.getTime() - WHATS_NEW_DAYS * DAY_MS),
        now,
      ),
    ),
    attempt(() => readPreferences(parsed.data)),
  ]);

  const unavailable: Extract<ResidentHome, { state: "ready" }>["unavailable"] =
    [];
  if (saved.state !== "ready") unavailable.push("saved");
  if (comingUp === null) unavailable.push("comingUp");
  if (whatsNew === null) unavailable.push("whatsNew");
  if (preferences === null) unavailable.push("preferences");

  const decorated =
    saved.state === "ready"
      ? await attempt(() => decorateBusinesses(saved.businesses, now))
      : [];
  if (decorated === null) unavailable.push("businesses");
  const businesses =
    decorated ??
    (saved.state === "ready"
      ? saved.businesses.map((item) => ({
          ...item,
          offer: null,
          upcomingEventCount: null,
        }))
      : []);
  const places =
    saved.state === "ready"
      ? await attempt(() => decoratePlaces(saved.places, now))
      : [];
  if (places === null) unavailable.push("places");

  return {
    state: "ready",
    counts: {
      businesses: saved.businesses.length,
      events: saved.events.length,
      places: saved.places.length,
    },
    comingUp: comingUp?.events ?? [],
    comingUpTruncated: comingUp?.truncated ?? false,
    businesses,
    savedEvents: saved.events,
    places:
      places ??
      (saved.state === "ready"
        ? saved.places.map((item) => ({
            ...item,
            businessCount: null,
            upcomingEventCount: null,
          }))
        : []),
    whatsNew,
    preferences,
    unavailable,
  };
}

export type SavedItems =
  | { state: "invalid" }
  | { state: "unavailable" }
  | {
      state: "ready";
      businesses: ResidentBusiness[];
      events: SavedEventSummary[];
      offers: SavedOfferSummary[];
      places: ResidentPlace[];
      /** Offers, event counts or place counts could not be read. */
      enrichmentFailed: boolean;
    };

/**
 * The saved-items page: the resident's saved businesses (with live offer and
 * event count), upcoming saved events and saved places (with counts).
 */
export async function loadSavedItems(
  userId: string,
  now: Date = new Date(),
  locale: "en" | "cy" = "en",
): Promise<SavedItems> {
  const saved = await listSavedDiscoveryForUser(userId, now);
  if (saved.state === "invalid") return { state: "invalid" };
  if (saved.state === "unavailable") return { state: "unavailable" };
  const savedOffers = await attempt(() =>
    listSavedOffersForUser(userId, locale, now),
  );
  const decoratedBusinesses = await attempt(() =>
    decorateBusinesses(saved.businesses, now),
  );
  const decoratedPlaces = await attempt(() =>
    decoratePlaces(saved.places, now),
  );
  return {
    state: "ready",
    businesses:
      decoratedBusinesses ??
      saved.businesses.map((item) => ({
        ...item,
        offer: null,
        upcomingEventCount: null,
      })),
    events: saved.events,
    offers: savedOffers ?? [],
    places:
      decoratedPlaces ??
      saved.places.map((item) => ({
        ...item,
        businessCount: null,
        upcomingEventCount: null,
      })),
    enrichmentFailed:
      decoratedBusinesses === null ||
      decoratedPlaces === null ||
      savedOffers === null,
  };
}
