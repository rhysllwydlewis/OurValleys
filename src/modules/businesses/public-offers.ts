import "server-only";

import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  category,
  place,
} from "@/lib/database/schema/business";
import {
  businessOffer,
  offerTranslation,
} from "@/lib/database/schema/business-operations";
import { loadContentImages, type ContentImageView } from "./content-images";
import { foldedMatch } from "@/modules/search/folded-sql";
import { placeScopeCondition } from "@/modules/reference-data/place-scope";

export type PublicOffer = {
  id: string;
  title: string;
  description: string;
  terms: string | null;
  endsAt: Date | null;
  businessName: string;
  businessSlug: string;
  /** The place the business is based in, for the card's "where". */
  placeName: string;
  categoryName: string;
  fictional: boolean;
  image: ContentImageView | null;
  /** True when `title` / `description` are the owner's Welsh (Welsh readers only). */
  welshTitle: boolean;
  welshDescription: boolean;
  welshTerms: boolean;
};

export type PublicOfferSort = "ending" | "newest";

export type PublicOfferListFilters = {
  query?: string;
  category?: string;
  place?: string;
  page?: number;
  /** Only offers that end within this many days (open-ended offers are left out). */
  endingWithinDays?: number;
  sort?: PublicOfferSort;
  /** Smaller pages for summaries such as site search; clamped to 1..24. */
  pageSize?: number;
  /** Welsh readers see the owner's Welsh title and description where written. */
  locale?: "en" | "cy";
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

const welshOfferJoin = () =>
  and(
    eq(offerTranslation.offerId, businessOffer.id),
    eq(offerTranslation.locale, "cy"),
  );

function offerDirectoryFilter(now: Date) {
  return and(
    eq(business.status, "published"),
    eq(businessOffer.status, "active"),
    or(isNull(businessOffer.startsAt), lte(businessOffer.startsAt, now)),
    or(isNull(businessOffer.endsAt), gte(businessOffer.endsAt, now)),
  );
}

function offerConditions(
  input: PublicOfferListFilters,
  options: { ignoreCategory?: boolean } = {},
  now = new Date(),
) {
  const filters = [offerDirectoryFilter(now)];
  const categorySlug = normaliseText(input.category);
  const placeSlug = normaliseText(input.place);
  const query = normaliseText(input.query);
  if (categorySlug && !options.ignoreCategory)
    filters.push(eq(category.slug, categorySlug));
  if (placeSlug) filters.push(placeScopeCondition(place.id, placeSlug));
  const days = input.endingWithinDays;
  if (days && Number.isInteger(days) && days > 0) {
    filters.push(
      lte(businessOffer.endsAt, new Date(now.getTime() + days * MS_PER_DAY)),
    );
  }
  if (query) {
    filters.push(
      or(
        foldedMatch(businessOffer.title, query, { fuzzy: true }),
        foldedMatch(businessOffer.description, query),
        foldedMatch(offerTranslation.title, query, { fuzzy: true }),
        foldedMatch(offerTranslation.description, query),
        foldedMatch(business.tradingName, query, { fuzzy: true }),
      )!,
    );
  }
  return and(...filters);
}

export type OfferCategoryCount = { slug: string; count: number };

/**
 * Active offers per category under every filter except the category itself,
 * so the category rail shows what each choice would give.
 */
export async function listOfferCategoryCounts(
  input: PublicOfferListFilters = {},
): Promise<OfferCategoryCount[]> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        slug: category.slug,
        count: sql<number>`count(*)::int`,
      })
      .from(businessOffer)
      .leftJoin(offerTranslation, welshOfferJoin())
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
      .where(offerConditions(input, { ignoreCategory: true }))
      .groupBy(category.slug);
    return rows;
  } catch {
    return [];
  }
}

export async function listPublicOffers(
  input: PublicOfferListFilters = {},
): Promise<PublicOfferListResult> {
  const pageSize = Number.isInteger(input.pageSize)
    ? Math.min(Math.max(input.pageSize as number, 1), OFFERS_PAGE_SIZE)
    : OFFERS_PAGE_SIZE;
  const page = normalisePage(input.page);

  try {
    const database = getDatabase();
    const offset = (page - 1) * pageSize;
    const whereClause = offerConditions(input);

    const [countRow] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessOffer)
      .leftJoin(offerTranslation, welshOfferJoin())
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

    const offerRows = await database
      .select({
        id: businessOffer.id,
        imageMediaId: businessOffer.imageMediaId,
        title: businessOffer.title,
        description: businessOffer.description,
        welshTitle: offerTranslation.title,
        welshDescription: offerTranslation.description,
        welshTerms: offerTranslation.terms,
        terms: businessOffer.terms,
        endsAt: businessOffer.endsAt,
        businessName: business.tradingName,
        businessSlug: business.slug,
        placeName: place.canonicalName,
        categoryName: category.name,
        fictional: business.isDemo,
      })
      .from(businessOffer)
      .leftJoin(offerTranslation, welshOfferJoin())
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
        ...(input.sort === "newest"
          ? [desc(businessOffer.createdAt)]
          : [sql`${businessOffer.endsAt} asc nulls last`]),
        asc(businessOffer.sortOrder),
        asc(businessOffer.id),
      )
      .limit(pageSize)
      .offset(offset);
    const images = await loadContentImages(
      offerRows.map((row) => row.imageMediaId),
    );
    const welshReader = input.locale === "cy";
    const offers: PublicOffer[] = offerRows.map(
      ({
        imageMediaId,
        welshTitle,
        welshDescription,
        welshTerms,
        ...offer
      }) => ({
        ...offer,
        terms: (welshReader && offer.terms && welshTerms) || offer.terms,
        welshTerms: welshReader && !!offer.terms && !!welshTerms,
        title: (welshReader && welshTitle) || offer.title,
        description: (welshReader && welshDescription) || offer.description,
        welshTitle: welshReader && !!welshTitle,
        welshDescription: welshReader && !!welshDescription,
        image: (imageMediaId && images.get(imageMediaId)) || null,
      }),
    );

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
