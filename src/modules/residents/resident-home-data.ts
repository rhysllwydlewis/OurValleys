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
  type SavedBusinessSummary,
  type SavedEventSummary,
  type SavedPlaceSummary,
} from "./saved-discovery";

const DAY_MS = 86_400_000;
const MAX_COMING_UP = 12;
const MAX_PLACES_WITH_COUNTS = 12;
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
  upcomingEventCount: number;
};

export type ResidentPlace = SavedPlaceSummary & {
  businessCount: number;
  upcomingEventCount: number;
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
      businesses: ResidentBusiness[];
      /** Saved events that have not finished yet (past ones drop away). */
      savedEvents: SavedEventSummary[];
      places: ResidentPlace[];
      /** Public additions in the resident's saved places and businesses. */
      whatsNew: PlaceDigestContent | null;
      preferences: ResidentPreferences;
      /** Sources that could not be read; the page says so rather than hiding it. */
      unavailable: ("saved" | "comingUp" | "whatsNew" | "places")[];
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
export async function listComingUpForUser(
  userId: string,
  now: Date,
): Promise<ComingUpEvent[]> {
  const parsed = identifierSchema.safeParse(userId);
  if (!parsed.success) return [];
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
          sql`${businessLocation.placeId} in (
            with recursive saved_scope(id) as (
              select p.id from resident_saved_place sp
              inner join place p on p.id = sp.place_id and p.status = 'active'
              where sp.user_id = ${parsed.data}
              union
              select r.child_place_id
              from place_relationship r
              inner join place cp on cp.id = r.child_place_id and cp.status = 'active'
              inner join saved_scope s on s.id = r.parent_place_id
              where r.relationship_type = 'contains'
            )
            select id from saved_scope
          )`,
        ),
      )
      .orderBy(asc(businessEvent.startsAt))
      .limit(MAX_COMING_UP * 2),
  ]);

  const tag = (rows: typeof direct, source: ComingUpEvent["source"]) =>
    rows.map((row) => ({ ...row, source }));
  return mergeComingUp([
    tag(direct, "saved"),
    tag(fromBusinesses, "business"),
    tag(fromPlaces, "place"),
  ]).slice(0, MAX_COMING_UP);
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

/** Businesses and upcoming events inside each saved place (whole-place scope). */
async function decoratePlaces(
  places: SavedPlaceSummary[],
  now: Date,
): Promise<ResidentPlace[]> {
  const database = getDatabase();
  const horizon = new Date(now.getTime() + RESIDENT_COMING_UP_DAYS * DAY_MS);
  return Promise.all(
    places.slice(0, MAX_PLACES_WITH_COUNTS).map(async (item) => {
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
              placeScopeCondition(businessLocation.placeId, item.slug),
            ),
          ),
      ]);
      return {
        ...item,
        businessCount: businesses[0]?.total ?? 0,
        upcomingEventCount: events[0]?.total ?? 0,
      };
    }),
  );
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

  const businesses =
    saved.state === "ready"
      ? ((await attempt(() => decorateBusinesses(saved.businesses, now))) ??
        saved.businesses.map((item) => ({
          ...item,
          offer: null,
          upcomingEventCount: 0,
        })))
      : [];
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
    comingUp: comingUp ?? [],
    businesses,
    savedEvents: saved.events,
    places:
      places ??
      (saved.state === "ready"
        ? saved.places.map((item) => ({
            ...item,
            businessCount: 0,
            upcomingEventCount: 0,
          }))
        : []),
    whatsNew,
    preferences: preferences ?? { digestOn: false, remindersOn: false },
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
      places: ResidentPlace[];
    };

/**
 * The saved-items page: the resident's saved businesses (with live offer and
 * event count), upcoming saved events and saved places (with counts).
 */
export async function loadSavedItems(
  userId: string,
  now: Date = new Date(),
): Promise<SavedItems> {
  const saved = await listSavedDiscoveryForUser(userId, now);
  if (saved.state === "invalid") return { state: "invalid" };
  if (saved.state === "unavailable") return { state: "unavailable" };
  const businesses =
    (await attempt(() => decorateBusinesses(saved.businesses, now))) ??
    saved.businesses.map((item) => ({
      ...item,
      offer: null,
      upcomingEventCount: 0,
    }));
  const places =
    (await attempt(() => decoratePlaces(saved.places, now))) ??
    saved.places.map((item) => ({
      ...item,
      businessCount: 0,
      upcomingEventCount: 0,
    }));
  return { state: "ready", businesses, events: saved.events, places };
}
