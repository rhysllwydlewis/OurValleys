import "server-only";

import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessUpdate } from "@/lib/database/schema/business-operations";
import { foldedMatch } from "@/modules/search/folded-sql";
import { placeScopeCondition } from "@/modules/reference-data/place-scope";

export type PublicUpdate = {
  id: string;
  title: string;
  body: string;
  publishedAt: Date;
  /** True when `title` and `body` are the owner's Welsh (Welsh readers only). */
  welsh: boolean;
};

export type PublicFeedUpdate = PublicUpdate & {
  businessName: string;
  businessSlug: string;
  placeName: string;
  categoryName: string;
  fictional: boolean;
};

export type PublicUpdateFeedFilters = {
  query?: string;
  category?: string;
  place?: string;
  page?: number;
  pageSize?: number;
  locale?: "en" | "cy";
};

export type PublicUpdateFeed =
  | {
      state: "ready";
      updates: PublicFeedUpdate[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    }
  | {
      state: "unavailable";
      updates: [];
      page: 1;
      pageSize: number;
      total: 0;
      totalPages: 0;
    };

export const FEED_PAGE_SIZE = 20;
const MAX_PAGE = 10_000;

function normaliseText(value: string | undefined): string | undefined {
  const normalised = value?.trim().slice(0, 80);
  return normalised ? normalised : undefined;
}

function normalisePage(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value < 1) return 1;
  return Math.min(value, MAX_PAGE);
}

type UpdateRow = {
  id: string;
  title: string;
  body: string;
  titleCy: string | null;
  bodyCy: string | null;
  publishedAt: Date | null;
};

/** Welsh readers get the Welsh version only where both fields are written. */
function localise(row: UpdateRow, locale: "en" | "cy" | undefined) {
  const welsh =
    locale === "cy" && !!row.titleCy?.trim() && !!row.bodyCy?.trim();
  return {
    id: row.id,
    title: welsh ? (row.titleCy as string) : row.title,
    body: welsh ? (row.bodyCy as string) : row.body,
    publishedAt: row.publishedAt ?? new Date(0),
    welsh,
  };
}

/**
 * The newest published updates of one business, for its website. The caller
 * has already resolved the business as published; this never returns drafts.
 */
export async function listBusinessUpdates(input: {
  businessId: string;
  locale?: "en" | "cy";
  limit?: number;
  offset?: number;
}): Promise<{
  updates: PublicUpdate[];
  total: number;
  /** True when the read failed, so callers do not mistake an outage for "none". */
  unavailable: boolean;
}> {
  const limit = Math.min(Math.max(input.limit ?? 3, 1), 50);
  try {
    const database = getDatabase();
    const where = and(
      eq(businessUpdate.businessId, input.businessId),
      eq(businessUpdate.status, "published"),
    );
    const [counted] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessUpdate)
      .where(where);
    const rows = await database
      .select({
        id: businessUpdate.id,
        title: businessUpdate.title,
        body: businessUpdate.body,
        titleCy: businessUpdate.titleCy,
        bodyCy: businessUpdate.bodyCy,
        publishedAt: businessUpdate.publishedAt,
      })
      .from(businessUpdate)
      .where(where)
      .orderBy(desc(businessUpdate.publishedAt), desc(businessUpdate.id))
      .limit(limit)
      .offset(Math.max(input.offset ?? 0, 0));
    return {
      updates: rows.map((row) => localise(row, input.locale)),
      total: counted?.count ?? 0,
      unavailable: false,
    };
  } catch {
    return { updates: [], total: 0, unavailable: true };
  }
}

/**
 * The page (1-based) of a business's updates list that holds one update, so
 * a link to a single update lands where it is. Null when it is not public.
 */
export async function findUpdatePage(input: {
  businessId: string;
  updateId: string;
  pageSize: number;
}): Promise<number | null> {
  try {
    const database = getDatabase();
    const [target] = await database
      .select({ publishedAt: businessUpdate.publishedAt })
      .from(businessUpdate)
      .where(
        and(
          eq(businessUpdate.id, input.updateId),
          eq(businessUpdate.businessId, input.businessId),
          eq(businessUpdate.status, "published"),
        ),
      );
    if (!target?.publishedAt) return null;
    const [ahead] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessUpdate)
      .where(
        and(
          eq(businessUpdate.businessId, input.businessId),
          eq(businessUpdate.status, "published"),
          or(
            gt(businessUpdate.publishedAt, target.publishedAt),
            and(
              eq(businessUpdate.publishedAt, target.publishedAt),
              gt(businessUpdate.id, input.updateId),
            ),
          ),
        ),
      );
    return Math.floor((ahead?.count ?? 0) / input.pageSize) + 1;
  } catch {
    return null;
  }
}

function feedConditions(input: PublicUpdateFeedFilters) {
  const filters = [
    eq(business.status, "published"),
    eq(businessUpdate.status, "published"),
  ];
  const categorySlug = normaliseText(input.category);
  const placeSlug = normaliseText(input.place);
  const query = normaliseText(input.query);
  if (categorySlug) filters.push(eq(category.slug, categorySlug));
  if (placeSlug) filters.push(placeScopeCondition(place.id, placeSlug));
  if (query) {
    filters.push(
      or(
        foldedMatch(businessUpdate.title, query, { fuzzy: true }),
        foldedMatch(businessUpdate.body, query),
        foldedMatch(businessUpdate.titleCy, query, { fuzzy: true }),
        foldedMatch(businessUpdate.bodyCy, query),
        foldedMatch(business.tradingName, query, { fuzzy: true }),
      )!,
    );
  }
  return and(...filters);
}

function feedFrom() {
  return getDatabase()
    .select({
      id: businessUpdate.id,
      title: businessUpdate.title,
      body: businessUpdate.body,
      titleCy: businessUpdate.titleCy,
      bodyCy: businessUpdate.bodyCy,
      publishedAt: businessUpdate.publishedAt,
      businessName: business.tradingName,
      businessSlug: business.slug,
      placeName: place.canonicalName,
      categoryName: category.name,
      fictional: business.isDemo,
    })
    .from(businessUpdate)
    .innerJoin(business, eq(business.id, businessUpdate.businessId))
    .innerJoin(category, eq(category.id, business.primaryCategoryId))
    .innerJoin(
      businessLocation,
      and(
        eq(businessLocation.businessId, business.id),
        eq(businessLocation.isPrimary, true),
        eq(businessLocation.status, "active"),
      ),
    )
    .innerJoin(place, eq(place.id, businessLocation.placeId));
}

/** Published updates from every published business, newest first. */
export async function listPublicUpdateFeed(
  input: PublicUpdateFeedFilters = {},
): Promise<PublicUpdateFeed> {
  const pageSize = Number.isInteger(input.pageSize)
    ? Math.min(Math.max(input.pageSize as number, 1), FEED_PAGE_SIZE)
    : FEED_PAGE_SIZE;
  const page = normalisePage(input.page);
  try {
    const database = getDatabase();
    const where = feedConditions(input);
    const [counted] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessUpdate)
      .innerJoin(business, eq(business.id, businessUpdate.businessId))
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
      .where(where);
    const total = counted?.count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    if (total > 0 && page > totalPages) {
      return listPublicUpdateFeed({ ...input, page: 1 });
    }
    const rows = await feedFrom()
      .where(where)
      .orderBy(desc(businessUpdate.publishedAt), desc(businessUpdate.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return {
      state: "ready",
      updates: rows.map((row) => ({
        ...localise(row, input.locale),
        businessName: row.businessName,
        businessSlug: row.businessSlug,
        placeName: row.placeName,
        categoryName: row.categoryName,
        fictional: row.fictional,
      })),
      page,
      pageSize,
      total,
      totalPages,
    };
  } catch {
    return {
      state: "unavailable",
      updates: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0,
    };
  }
}
