import "server-only";

import { and, asc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";

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
};

export type PublicEventListFilters = {
  query?: string;
  category?: string;
  place?: string;
  page?: number;
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
};

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

export async function listPublicEvents(
  input: PublicEventListFilters = {},
): Promise<PublicEventListResult> {
  const pageSize = EVENTS_PAGE_SIZE;
  const page = normalisePage(input.page);

  try {
    const database = getDatabase();
    const categorySlug = normaliseSlug(input.category);
    const placeSlug = normaliseSlug(input.place);
    const query = normaliseQuery(input.query);
    const offset = (page - 1) * pageSize;

    const filters = [publicLifecycleFilter(new Date())];
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
    const whereClause = and(...filters, queryFilter);

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

    const events = await database
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

    return event ? { state: "found", event } : { state: "not_found" };
  } catch {
    return { state: "unavailable" };
  }
}
