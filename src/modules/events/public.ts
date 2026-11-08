import "server-only";

import { unstable_cache } from "next/cache";
import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  category,
  place,
} from "@/lib/database/schema/business";
import {
  businessEvent,
  businessSlugRedirect,
  eventTranslation,
} from "@/lib/database/schema/business-operations";
import {
  loadContentImages,
  type ContentImageView,
} from "@/modules/businesses/content-images";
import {
  londonDayKey,
  londonDayKeyAfter,
  parseEventDay,
  parseEventWhen,
  resolveEventDayWindow,
  resolveEventWindow,
  type EventWhen,
} from "./date-window";
import { countEventsByDay, type DayCount } from "./agenda";
import { monthWindow, parseEventMonth } from "./month";
import { parseEventWeek, weekWindow } from "./week";
import { placeScopeCondition } from "@/modules/reference-data/place-scope";
import { foldedMatch } from "@/modules/search/folded-sql";

export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  locationDisplay: string | null;
  startsAt: Date;
  endsAt: Date | null;
  bookingUrl: string | null;
  businessName: string;
  businessSlug: string;
  fictional: boolean;
  /** Absent when the event has no picture. */
  image?: ContentImageView | null;
  /** True when `title` / `description` are the owner's Welsh (Welsh readers only). */
  welshTitle?: boolean;
  welshDescription?: boolean;
};

export type PublicEventListFilters = {
  query?: string;
  category?: string;
  place?: string;
  /** One business, by slug. Public events only, as for every other filter. */
  business?: string;
  when?: EventWhen;
  /** One London calendar day, `YYYY-MM-DD`. Takes precedence over `when`. */
  day?: string;
  page?: number;
  /**
   * A whole London window (a month or a week) instead of `day`/`when`; used by
   * the period-scoped calendar feeds.
   */
  window?: { from: Date; to: Date };
  /** Larger page for calendar feeds; clamped to MAX_PAGE_SIZE. */
  pageSize?: number;
  /** Welsh readers see the owner's Welsh title and description where written. */
  locale?: "en" | "cy";
};

export type PublicEventListResult =
  | {
      state: "ready";
      events: PublicEvent[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    }
  | {
      state: "unavailable";
      events: [];
      page: 1;
      pageSize: number;
      total: 0;
      totalPages: 0;
      hasPreviousPage: false;
      hasNextPage: false;
    };

export type PublicEventDetailResult =
  | { state: "found"; event: PublicEvent }
  | { state: "not_found" }
  | { state: "unavailable" };

const eventIdSchema = z.uuid();

const EVENTS_PAGE_SIZE = 24;
const MAX_PAGE = 10_000;
const MAX_PAGE_SIZE = 200;

function normaliseSlug(value: string | undefined): string | undefined {
  const normalised = value?.trim().slice(0, 80);
  return normalised ? normalised : undefined;
}

function normaliseQuery(value: string | undefined): string | undefined {
  const normalised = value?.trim().slice(0, 80);
  return normalised ? normalised : undefined;
}

function normalisePage(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value < 1) return 1;
  return Math.min(value, MAX_PAGE);
}

const publicEventSelection = {
  id: businessEvent.id,
  title: businessEvent.title,
  description: businessEvent.description,
  locationDisplay: businessEvent.locationDisplay,
  startsAt: businessEvent.startsAt,
  endsAt: businessEvent.endsAt,
  bookingUrl: businessEvent.bookingUrl,
  businessName: business.tradingName,
  businessSlug: business.slug,
  fictional: business.isDemo,
  imageMediaId: businessEvent.imageMediaId,
  welshTitleText: eventTranslation.title,
  welshDescriptionText: eventTranslation.description,
};

type PublicEventRow = {
  imageMediaId: string | null;
  welshTitleText: string | null;
  welshDescriptionText: string | null;
} & Omit<PublicEvent, "image" | "welshTitle" | "welshDescription">;

const welshEventJoin = () =>
  and(
    eq(eventTranslation.eventId, businessEvent.id),
    eq(eventTranslation.locale, "cy"),
  );

async function withImages(
  rows: PublicEventRow[],
  locale?: "en" | "cy",
): Promise<PublicEvent[]> {
  const images = await loadContentImages(rows.map((row) => row.imageMediaId));
  const welshReader = locale === "cy";
  return rows.map(
    ({ imageMediaId, welshTitleText, welshDescriptionText, ...event }) => ({
      ...event,
      title: (welshReader && welshTitleText) || event.title,
      description: (welshReader && welshDescriptionText) || event.description,
      welshTitle: welshReader && !!welshTitleText,
      welshDescription: welshReader && !!welshDescriptionText,
      image: (imageMediaId && images.get(imageMediaId)) || null,
    }),
  );
}

function publicLifecycleFilter(now: Date) {
  return and(
    eq(business.status, "published"),
    eq(businessEvent.status, "active"),
    or(
      and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
      gte(businessEvent.endsAt, now),
    ),
  );
}

function eventDirectoryLocationJoin() {
  return and(
    eq(businessLocation.businessId, business.id),
    eq(businessLocation.isPrimary, true),
    eq(businessLocation.status, "active"),
  );
}

function buildWhere(
  input: PublicEventListFilters,
  now: Date,
  windowOverride?: { from: Date; to: Date },
) {
  const filters = [publicLifecycleFilter(now)];
  const day = parseEventDay(input.day);
  const when = parseEventWhen(input.when);
  const window =
    windowOverride ??
    (day
      ? resolveEventDayWindow(day, now)
      : when
        ? resolveEventWindow(when, now)
        : null);
  if (window) {
    filters.push(
      lt(businessEvent.startsAt, window.to),
      or(
        and(
          isNull(businessEvent.endsAt),
          gte(businessEvent.startsAt, window.from),
        ),
        gt(businessEvent.endsAt, window.from),
      ),
    );
  }
  const categorySlug = normaliseSlug(input.category);
  const placeSlug = normaliseSlug(input.place);
  // Generated business slugs can exceed the search-filter cap, so keep them whole.
  const businessSlug = input.business?.trim().slice(0, 200) || undefined;
  const query = normaliseQuery(input.query);
  if (businessSlug) {
    // A subscription made before an approved address change keeps working.
    filters.push(
      or(
        eq(business.slug, businessSlug),
        inArray(
          business.id,
          getDatabase()
            .select({ id: businessSlugRedirect.businessId })
            .from(businessSlugRedirect)
            .where(eq(businessSlugRedirect.fromSlug, businessSlug)),
        ),
      )!,
    );
  }
  if (categorySlug) filters.push(eq(category.slug, categorySlug));
  if (placeSlug) filters.push(placeScopeCondition(place.id, placeSlug));
  const queryFilter = query
    ? or(
        foldedMatch(businessEvent.title, query, { fuzzy: true }),
        foldedMatch(businessEvent.description, query),
        foldedMatch(eventTranslation.title, query, { fuzzy: true }),
        foldedMatch(eventTranslation.description, query),
        foldedMatch(businessEvent.locationDisplay, query),
        foldedMatch(business.tradingName, query, { fuzzy: true }),
      )
    : undefined;
  return and(...filters, queryFilter);
}

export async function listPublicEvents(
  input: PublicEventListFilters = {},
): Promise<PublicEventListResult> {
  const pageSize = input.pageSize
    ? Math.min(Math.max(1, Math.floor(input.pageSize)), MAX_PAGE_SIZE)
    : EVENTS_PAGE_SIZE;
  const page = normalisePage(input.page);

  try {
    const database = getDatabase();
    const offset = (page - 1) * pageSize;

    const now = new Date();
    const whereClause = buildWhere(input, now, input.window);

    const [countRow] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessEvent)
      .leftJoin(eventTranslation, welshEventJoin())
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .innerJoin(businessLocation, eventDirectoryLocationJoin())
      .innerJoin(place, eq(place.id, businessLocation.placeId))
      .where(whereClause);
    const total = countRow?.count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    if (total > 0 && page > totalPages) {
      return listPublicEvents({ ...input, page: 1 });
    }

    const eventRows = await database
      .select(publicEventSelection)
      .from(businessEvent)
      .leftJoin(eventTranslation, welshEventJoin())
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .innerJoin(businessLocation, eventDirectoryLocationJoin())
      .innerJoin(place, eq(place.id, businessLocation.placeId))
      .where(whereClause)
      .orderBy(asc(businessEvent.startsAt))
      .limit(pageSize)
      .offset(offset);
    const events = await withImages(eventRows, input.locale);

    return {
      state: "ready",
      events,
      page,
      pageSize,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };
  } catch {
    return {
      state: "unavailable",
      events: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }
}

export async function getPublicEvent(
  eventId: string,
  locale?: "en" | "cy",
): Promise<PublicEventDetailResult> {
  if (!eventIdSchema.safeParse(eventId).success) return { state: "not_found" };

  try {
    const database = getDatabase();
    const [event] = await database
      .select(publicEventSelection)
      .from(businessEvent)
      .leftJoin(eventTranslation, welshEventJoin())
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .where(
        and(eq(businessEvent.id, eventId), publicLifecycleFilter(new Date())),
      )
      .limit(1);

    if (!event) return { state: "not_found" };
    const [withImage] = await withImages([event], locale);
    return withImage
      ? { state: "found", event: withImage }
      : { state: "not_found" };
  } catch {
    return { state: "unavailable" };
  }
}

const DAY_STRIP_LENGTH = 14;
const DAY_STRIP_ROW_LIMIT = 500;

/**
 * How many published, active events touch each of the next fourteen London
 * days, under the visitor's search, category and place (not their date
 * choice, so the strip keeps showing where the events are). Returns null when
 * the data is unavailable; the page then simply omits the strip.
 */
export async function listEventDayCounts(
  input: Pick<PublicEventListFilters, "query" | "category" | "place"> = {},
  now: Date = new Date(),
): Promise<DayCount[] | null> {
  try {
    try {
      return await cachedEventDayCounts(
        input.query ?? null,
        input.category ?? null,
        input.place ?? null,
        londonDayKeyAfter(now, 0),
      );
    } catch {
      // Cache unavailable (for example outside a Next request) or the load
      // failed: try once live, then omit the strip.
      return await loadEventDayCounts(input, now);
    }
  } catch {
    return null;
  }
}

/** Throws on a database failure so the cache never stores a failed load. */
async function loadEventDayCounts(
  input: Pick<PublicEventListFilters, "query" | "category" | "place">,
  now: Date,
): Promise<DayCount[] | null> {
  const database = getDatabase();
  const lastDay = londonDayKeyAfter(now, DAY_STRIP_LENGTH - 1);
  const window = resolveEventDayWindow(lastDay, new Date(0));
  const rows = await database
    .select({
      startsAt: businessEvent.startsAt,
      endsAt: businessEvent.endsAt,
    })
    .from(businessEvent)
    .leftJoin(eventTranslation, welshEventJoin())
    .innerJoin(business, eq(business.id, businessEvent.businessId))
    .innerJoin(category, eq(category.id, business.primaryCategoryId))
    .innerJoin(businessLocation, eventDirectoryLocationJoin())
    .innerJoin(place, eq(place.id, businessLocation.placeId))
    .where(and(buildWhere(input, now), lt(businessEvent.startsAt, window.to)))
    .orderBy(asc(businessEvent.startsAt))
    .limit(DAY_STRIP_ROW_LIMIT);
  // A truncated read would show later busy days as empty, so omit the strip.
  if (rows.length >= DAY_STRIP_ROW_LIMIT) return null;
  return countEventsByDay(rows, now, DAY_STRIP_LENGTH);
}

/**
 * Counts only, so one entry per search, category, place and London day is safe
 * to share. The day key is part of the cache key; the load reads the clock itself.
 */
const cachedEventDayCounts = unstable_cache(
  async (
    query: string | null,
    category: string | null,
    place: string | null,
    dayKey: string,
  ) => {
    void dayKey; // part of the cache key only
    return loadEventDayCounts(
      {
        query: query ?? undefined,
        category: category ?? undefined,
        place: place ?? undefined,
      },
      new Date(),
    );
  },
  ["public-event-day-counts"],
  { revalidate: 60, tags: ["events"] },
);

const MONTH_ROW_LIMIT = 300;

export type PublicEventMonthResult =
  | {
      state: "ready";
      month: string;
      events: PublicEvent[];
      /** True when the month holds more than were read; the grid says so. */
      truncated: boolean;
    }
  | { state: "unavailable"; month: string };

/**
 * Every published, active event touching one London calendar month, under the
 * visitor's search, category and place. Finished events are not public, so the
 * days of the current month before now show nothing. An invalid month is
 * answered as "unavailable" rather than guessed.
 */
export async function listPublicEventsForMonth(
  input: Pick<
    PublicEventListFilters,
    "query" | "category" | "place" | "locale"
  > & {
    month: string;
  },
  now: Date = new Date(),
): Promise<PublicEventMonthResult> {
  const month = parseEventMonth(input.month);
  if (!month) return { state: "unavailable", month: input.month };
  try {
    const database = getDatabase();
    const rows = await database
      .select(publicEventSelection)
      .from(businessEvent)
      .leftJoin(eventTranslation, welshEventJoin())
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .innerJoin(businessLocation, eventDirectoryLocationJoin())
      .innerJoin(place, eq(place.id, businessLocation.placeId))
      .where(buildWhere(input, now, monthWindow(month)))
      .orderBy(asc(businessEvent.startsAt), asc(businessEvent.id))
      .limit(MONTH_ROW_LIMIT + 1);
    const truncated = rows.length > MONTH_ROW_LIMIT;
    const events = await withImages(
      rows.slice(0, MONTH_ROW_LIMIT),
      input.locale,
    );
    return { state: "ready", month, events, truncated };
  } catch {
    return { state: "unavailable", month };
  }
}

export type PublicEventWeekResult =
  | {
      state: "ready";
      /** The Monday of the week. */
      week: string;
      events: PublicEvent[];
      truncated: boolean;
    }
  | { state: "unavailable"; week: string };

/**
 * Every published, active event touching one London week (Monday to Sunday),
 * under the visitor's search, category and place. An invalid week is answered
 * as "unavailable" rather than guessed.
 */
export async function listPublicEventsForWeek(
  input: Pick<
    PublicEventListFilters,
    "query" | "category" | "place" | "locale"
  > & {
    week: string;
  },
  now: Date = new Date(),
): Promise<PublicEventWeekResult> {
  const week = parseEventWeek(input.week);
  if (!week) return { state: "unavailable", week: input.week };
  try {
    const database = getDatabase();
    const rows = await database
      .select(publicEventSelection)
      .from(businessEvent)
      .leftJoin(eventTranslation, welshEventJoin())
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .innerJoin(businessLocation, eventDirectoryLocationJoin())
      .innerJoin(place, eq(place.id, businessLocation.placeId))
      .where(buildWhere(input, now, weekWindow(week)))
      .orderBy(asc(businessEvent.startsAt), asc(businessEvent.id))
      .limit(MONTH_ROW_LIMIT + 1);
    const truncated = rows.length > MONTH_ROW_LIMIT;
    const events = await withImages(
      rows.slice(0, MONTH_ROW_LIMIT),
      input.locale,
    );
    return { state: "ready", week, events, truncated };
  } catch {
    return { state: "unavailable", week };
  }
}

/**
 * The London day of the first public event that starts at or after `from`
 * under the visitor's filters, or null when nothing later is listed (or the
 * data is unavailable). Powers "jump to the next date with events" on empty
 * weeks and months. Only events that have not finished are public, so this
 * never points at the past.
 */
export async function findNextEventDay(
  input: Pick<PublicEventListFilters, "query" | "category" | "place">,
  from: Date,
  now: Date = new Date(),
): Promise<string | null> {
  try {
    const database = getDatabase();
    const start = from.getTime() > now.getTime() ? from : now;
    const [row] = await database
      .select({ startsAt: businessEvent.startsAt })
      .from(businessEvent)
      .leftJoin(eventTranslation, welshEventJoin())
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .innerJoin(businessLocation, eventDirectoryLocationJoin())
      .innerJoin(place, eq(place.id, businessLocation.placeId))
      .where(and(buildWhere(input, now), gte(businessEvent.startsAt, start)))
      .orderBy(asc(businessEvent.startsAt), asc(businessEvent.id))
      .limit(1);
    return row ? londonDayKey(row.startsAt) : null;
  } catch {
    return null;
  }
}
