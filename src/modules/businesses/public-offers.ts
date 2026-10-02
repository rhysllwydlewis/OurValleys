import "server-only";

import { and, asc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessOffer } from "@/lib/database/schema/business-operations";

export type PublicOffer = {
  id: string;
  title: string;
  description: string;
  terms: string | null;
  endsAt: Date | null;
  businessName: string;
  businessSlug: string;
  fictional: boolean;
};

export type PublicOfferListFilters = {
  query?: string;
  category?: string;
  place?: string;
  page?: number;
};

export type PublicOfferListResult =
  | {
      state: "ready";
      offers: PublicOffer[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    }
  | {
      state: "unavailable";
      offers: [];
      page: 1;
      pageSize: number;
      total: 0;
      totalPages: 0;
      hasPreviousPage: false;
      hasNextPage: false;
    };

const OFFERS_PAGE_SIZE = 24;
const MAX_PAGE = 10_000;
const MS_PER_DAY = 86_400_000;

function normaliseText(value: string | undefined): string | undefined {
  const normalised = value?.trim().slice(0, 80);
  return normalised ? normalised : undefined;
}

function normalisePage(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value < 1) return 1;
  return Math.min(value, MAX_PAGE);
}

/** Whole days left, rounded up: an offer ending later today is "0" days only once expired. */
export function daysUntilOfferEnds(
  endsAt: Date | null,
  now: Date,
): number | null {
  if (!endsAt) return null;
  return Math.max(
    0,
    Math.ceil((endsAt.getTime() - now.getTime()) / MS_PER_DAY),
  );
}

function offerDirectoryFilter(now: Date) {
  return and(
    eq(business.status, "published"),
    eq(businessOffer.status, "active"),
    or(isNull(businessOffer.startsAt), lte(businessOffer.startsAt, now)),
    or(isNull(businessOffer.endsAt), gte(businessOffer.endsAt, now)),
  );
}

export async function listPublicOffers(
  input: PublicOfferListFilters = {},
): Promise<PublicOfferListResult> {
  const pageSize = OFFERS_PAGE_SIZE;
  const page = normalisePage(input.page);

  try {
    const database = getDatabase();
    const categorySlug = normaliseText(input.category);
    const placeSlug = normaliseText(input.place);
    const query = normaliseText(input.query);
    const offset = (page - 1) * pageSize;

    const filters = [offerDirectoryFilter(new Date())];
    if (categorySlug) filters.push(eq(category.slug, categorySlug));
    if (placeSlug) filters.push(eq(place.slug, placeSlug));
    const queryFilter = query
      ? or(
          ilike(businessOffer.title, `%${query}%`),
          ilike(businessOffer.description, `%${query}%`),
          ilike(business.tradingName, `%${query}%`),
        )
      : undefined;
    const whereClause = and(...filters, queryFilter);

    const [countRow] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessOffer)
      .innerJoin(business, eq(business.id, businessOffer.businessId))
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
      .where(whereClause);
    const total = countRow?.count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    if (total > 0 && page > totalPages) {
      return listPublicOffers({ ...input, page: 1 });
    }

    const offers = await database
      .select({
        id: businessOffer.id,
        title: businessOffer.title,
        description: businessOffer.description,
        terms: businessOffer.terms,
        endsAt: businessOffer.endsAt,
        businessName: business.tradingName,
        businessSlug: business.slug,
        fictional: business.isDemo,
      })
      .from(businessOffer)
      .innerJoin(business, eq(business.id, businessOffer.businessId))
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
      .where(whereClause)
      // Soonest-ending first so residents see what they could miss; open-ended last.
      .orderBy(
        sql`${businessOffer.endsAt} asc nulls last`,
        asc(businessOffer.sortOrder),
        asc(businessOffer.id),
      )
      .limit(pageSize)
      .offset(offset);

    return {
      state: "ready",
      offers,
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
      offers: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }
}
