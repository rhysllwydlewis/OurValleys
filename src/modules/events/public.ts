import "server-only";

import { and, asc, eq, gte, ilike, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";
import {
  loadContentImages,
  type ContentImageView,
} from "@/modules/businesses/content-images";
import {
  londonDayKeyAfter,
  parseEventDay,
  parseEventWhen,
  resolveEventDayWindow,
  resolveEventWindow,
  type EventWhen,
} from "./date-window";
import { countEventsByDay, type DayCount } from "./agenda";

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
};

export type PublicEventListFilters = {
  query?: string;
  category?: string;
  place?: string;
  when?: EventWhen;
  /** One London calendar day, `YYYY-MM-DD`. Takes precedence over `when`. */
  day?: string;
  page?: number;
  /** Larger page for calendar feeds; clamped to MAX_PAGE_SIZE. */
  pageSize?: number;
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
};

type PublicEventRow = {
  imageMediaId: string | null;
} & Omit<PublicEvent, "image">;

async function withImages(rows: PublicEventRow[]): Promise<PublicEvent[]> {
  const images = await loadContentImages(rows.map((row) => row.imageMediaId));
  return rows.map(({ imageMediaId, ...event }) => ({
    ...event,
    image: (imageMediaId && images.get(imageMediaId)) || null,
  }));
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

function buildWhere(input: PublicEventListFilters, now: Date) {
  const filters = [publicLifecycleFilter(now)];
  const day = parseEventDay(input.day);
  const when = parseEventWhen(input.when);
  const window = day
    ? resolveEventDayWindow(day, now)
    : when
      ? resolveEventWindow(when, now)
      : null;
  if (window) {
    filters.push(
      lt(businessEvent.startsAt, window.to),
      or(
        and(
          isNull(businessEvent.endsAt),
          gte(businessEvent.startsAt, window.from),
        ),
        gte(businessEvent.endsAt, window.from),
      ),
    );
  }
  const categorySlug = normaliseSlug(input.category);
  const placeSlug = normaliseSlug(input.place);
  const query = normaliseQuery(input.query);
  if (categorySlug) filters.push(eq(category.slug, categorySlug));
  if (placeSlug) filters.push(eq(place.slug, placeSlug));
  const queryFilter = query
    ? or(
        ilike(businessEvent.title, `%${query}%`),
        ilike(businessEvent.description, `%${query}%`),
        ilike(businessEvent.locationDisplay, `%${query}%`),
        ilike(business.tradingName, `%${query}%`),
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
    const whereClause = buildWhere(input, now);

    const [countRow] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessEvent)
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
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .innerJoin(businessLocation, eventDirectoryLocationJoin())
      .innerJoin(place, eq(place.id, businessLocation.placeId))
      .where(whereClause)
      .orderBy(asc(businessEvent.startsAt))
      .limit(pageSize)
      .offset(offset);
    const events = await withImages(eventRows);

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
): Promise<PublicEventDetailResult> {
  if (!eventIdSchema.safeParse(eventId).success) return { state: "not_found" };

  try {
    const database = getDatabase();
    const [event] = await database
      .select(publicEventSelection)
      .from(businessEvent)
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .where(
        and(eq(businessEvent.id, eventId), publicLifecycleFilter(new Date())),
      )
      .limit(1);

    if (!event) return { state: "not_found" };
    const [withImage] = await withImages([event]);
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
    const database = getDatabase();
    const lastDay = londonDayKeyAfter(now, DAY_STRIP_LENGTH - 1);
    const window = resolveEventDayWindow(lastDay, new Date(0));
    const rows = await database
      .select({
        startsAt: businessEvent.startsAt,
        endsAt: businessEvent.endsAt,
      })
      .from(businessEvent)
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
  } catch {
    return null;
  }
}
