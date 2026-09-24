import "server-only";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDatabase, getDatabaseClient } from "@/lib/database/client";
import { businessAttributes } from "@/lib/database/schema/business-attributes";
import {
  business,
  businessLocation,
  businessPublication,
  businessSite,
  category,
  openingHoursRule,
  place,
  service,
} from "@/lib/database/schema/business";
import { placeCoordinate } from "@/lib/database/schema/reference";
import { publicMediaUrl } from "@/lib/media-storage";
import { getBusinessRatingSummary } from "./reviews";
import type {
  BusinessDirectoryFilters,
  BusinessDirectoryResult,
  PublicBusinessDetail,
  PublicBusinessResult,
  PublicBusinessSummary,
} from "./types";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;
const MAX_PAGE = 10_000;
const DEFAULT_RADIUS_KM = 8;
const MAX_RADIUS_KM = 40;

const LONDON_WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * The `opening_hours_rule` day-of-week and `opens_at`/`closes_at` columns are
 * entered by business owners in local UK time with no per-business timezone
 * field, so "open now" is resolved against Europe/London to match them.
 */
function londonNow(now: Date): { dayOfWeek: number; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return {
    dayOfWeek: LONDON_WEEKDAY_INDEX[weekday] ?? 0,
    time: `${hour === "24" ? "00" : hour}:${minute}`,
  };
}

type DirectoryRow = {
  id: string;
  slug: string;
  trading_name: string;
  welsh_name: string | null;
  summary: string;
  category_name: string;
  category_slug: string;
  place_name: string;
  place_slug: string;
  verification_status: string;
  is_demo: boolean;
  updated_at: Date;
  total_count: number | string;
  rating_average: string | null;
  rating_count: number | string;
  card_media_storage_key: string | null;
  card_media_focal_x: number | null;
  card_media_focal_y: number | null;
  distance_km: number | string | null;
};

function normaliseSearchValue(value: string | undefined): string | undefined {
  const normalised = value?.trim().slice(0, 80);
  return normalised ? normalised : undefined;
}

function normalisePositiveInteger(
  value: number | undefined,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (!Number.isInteger(value) || !value || value < 1) return fallback;
  return Math.min(value, maximum);
}

function toVerificationStatus(value: string): "unverified" | "verified" {
  return value === "verified" ? "verified" : "unverified";
}

function normaliseRadiusKm(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value <= 0) return DEFAULT_RADIUS_KM;
  return Math.min(value, MAX_RADIUS_KM);
}

/**
 * Locality-centroid coordinate for the `nearPlace` filter's origin. Returns
 * null for an unknown place, an inactive place or one without a stored
 * coordinate, so an invalid value simply disables distance filtering rather
 * than erroring the whole search.
 */
async function resolveNearOrigin(
  placeSlug: string | null,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!placeSlug) return null;

  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        latitude: placeCoordinate.latitude,
        longitude: placeCoordinate.longitude,
      })
      .from(place)
      .innerJoin(placeCoordinate, eq(placeCoordinate.placeId, place.id))
      .where(and(eq(place.slug, placeSlug), eq(place.status, "active")))
      .limit(1);

    return row ?? null;
  } catch {
    return null;
  }
}

function resolveCardImage(row: DirectoryRow) {
  if (!row.card_media_storage_key) return null;
  const url = publicMediaUrl(row.card_media_storage_key);
  if (!url) return null;
  return {
    url,
    focalX: row.card_media_focal_x ?? 50,
    focalY: row.card_media_focal_y ?? 50,
  };
}

/**
 * Privacy-safe public directory search. Ranking considers names, summaries,
 * services, category labels and bilingual search aliases. Unpublished,
 * suspended or incomplete records remain excluded before scoring.
 */
export async function listPublishedBusinesses(
  input: BusinessDirectoryFilters = {},
): Promise<BusinessDirectoryResult> {
  const pageSize = normalisePositiveInteger(
    input.pageSize,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );

  try {
    const client = getDatabaseClient();
    const query = normaliseSearchValue(input.query) ?? null;
    const categorySlug = normaliseSearchValue(input.category) ?? null;
    const placeSlug = normaliseSearchValue(input.place) ?? null;
    const page = normalisePositiveInteger(input.page, 1, MAX_PAGE);
    const offset = (page - 1) * pageSize;
    const verifiedOnly = input.verifiedOnly === true;
    const openNow = input.openNow === true;
    const accessibleOnly = input.accessibleOnly === true;
    const welshSpeakingOnly = input.welshSpeakingOnly === true;
    const { dayOfWeek, time } = londonNow(input.now ?? new Date());

    const nearPlaceSlug = normaliseSearchValue(input.nearPlace) ?? null;
    const nearOrigin = await resolveNearOrigin(nearPlaceSlug);
    const originLat = nearOrigin?.latitude ?? null;
    const originLng = nearOrigin?.longitude ?? null;
    const radiusKm = nearOrigin ? normaliseRadiusKm(input.radiusKm) : null;

    const rows = await client<DirectoryRow[]>`
      with search_input as (
        select lower(public.ourvalleys_unaccent(${query}::text)) as query
      ),
      ranked_businesses as (
        select
          b.id,
          b.slug,
          b.trading_name,
          b.welsh_name,
          b.summary,
          c.name as category_name,
          c.slug as category_slug,
          p.canonical_name as place_name,
          p.slug as place_slug,
          b.verification_summary_status as verification_status,
          b.is_demo,
          b.updated_at,
          case
            when ${originLat}::double precision is null or pc.latitude is null then null
            else 2 * 6371 * asin(least(1, sqrt(
              power(sin(radians(pc.latitude - ${originLat}::double precision) / 2), 2) +
              cos(radians(${originLat}::double precision)) * cos(radians(pc.latitude)) *
              power(sin(radians(pc.longitude - ${originLng}::double precision) / 2), 2)
            )))
          end as distance_km,
          (
            select avg(br.rating)
            from business_review br
            where br.business_id = b.id and br.status = 'published'
          ) as rating_average,
          (
            select count(*)
            from business_review br
            where br.business_id = b.id and br.status = 'published'
          ) as rating_count,
          card_media.storage_key as card_media_storage_key,
          card_media.focal_x as card_media_focal_x,
          card_media.focal_y as card_media_focal_y,
          case
            when search.query is null then 0
            else greatest(
              case
                when lower(public.ourvalleys_unaccent(b.trading_name)) = search.query then 3
                when lower(public.ourvalleys_unaccent(b.trading_name)) like search.query || '%' then 2.2
                else 0
              end,
              similarity(lower(public.ourvalleys_unaccent(b.trading_name)), search.query) * 1.8,
              similarity(lower(public.ourvalleys_unaccent(b.summary)), search.query) * 0.65,
              similarity(lower(public.ourvalleys_unaccent(c.name)), search.query) * 1.1,
              coalesce((
                select max(
                  similarity(lower(public.ourvalleys_unaccent(s.name)), search.query)
                ) * 1.45
                from service s
                where s.business_id = b.id and s.status = 'active'
              ), 0),
              coalesce((
                select max(
                  similarity(lower(public.ourvalleys_unaccent(ca.label)), search.query)
                ) * 1.35
                from category_alias ca
                where ca.category_id = c.id and ca.status = 'active'
              ), 0)
            )
          end as relevance_score
        from business b
        cross join search_input search
        inner join business_publication bp
          on bp.business_id = b.id
          and bp.status = 'published'
          and bp.published_at is not null
        inner join business_site bs
          on bs.id = bp.business_site_id
          and bs.business_id = b.id
          and bs.status = 'published'
          and bs.published_at is not null
        inner join category c
          on c.id = b.primary_category_id
          and c.status = 'active'
        inner join business_location bl
          on bl.business_id = b.id
          and bl.status = 'active'
          and bl.is_primary = true
        inner join place p
          on p.id = bl.place_id
          and p.status = 'active'
        left join place_coordinate pc
          on pc.place_id = p.id
        left join business_attributes ba
          on ba.business_id = b.id
        left join lateral (
          select bm.storage_key, bm.focal_x, bm.focal_y
          from business_media bm
          where bm.business_id = b.id
            and bm.status = 'active'
            and bm.role in ('hero', 'logo')
          order by case bm.role when 'hero' then 0 else 1 end
          limit 1
        ) card_media on true
        where b.status = 'published'
          and b.suspended_at is null
          and (${categorySlug}::text is null or c.slug = ${categorySlug})
          and (${placeSlug}::text is null or p.slug = ${placeSlug})
          and (${verifiedOnly}::boolean is not true or b.verification_summary_status = 'verified')
          and (${accessibleOnly}::boolean is not true or ba.step_free_access = true)
          and (${welshSpeakingOnly}::boolean is not true or ba.welsh_speaking = true)
          and (
            ${openNow}::boolean is not true
            or exists (
              select 1 from opening_hours_rule ohr
              where ohr.business_location_id = bl.id
                and ohr.day_of_week = ${dayOfWeek}
                and ohr.is_closed = false
                and ohr.opens_at is not null
                and ohr.closes_at is not null
                and ${time} >= ohr.opens_at
                and ${time} < ohr.closes_at
            )
          )
          and (
            search.query is null
            or lower(public.ourvalleys_unaccent(b.trading_name)) like '%' || search.query || '%'
            or lower(public.ourvalleys_unaccent(b.summary)) like '%' || search.query || '%'
            or lower(public.ourvalleys_unaccent(b.description)) like '%' || search.query || '%'
            or lower(public.ourvalleys_unaccent(c.name)) like '%' || search.query || '%'
            or similarity(lower(public.ourvalleys_unaccent(b.trading_name)), search.query) >= 0.22
            or exists (
              select 1 from service s
              where s.business_id = b.id
                and s.status = 'active'
                and (
                  lower(public.ourvalleys_unaccent(s.name)) like '%' || search.query || '%'
                  or lower(public.ourvalleys_unaccent(s.description)) like '%' || search.query || '%'
                  or similarity(lower(public.ourvalleys_unaccent(s.name)), search.query) >= 0.22
                )
            )
            or exists (
              select 1 from category_alias ca
              where ca.category_id = c.id
                and ca.status = 'active'
                and (
                  lower(public.ourvalleys_unaccent(ca.label)) like '%' || search.query || '%'
                  or similarity(lower(public.ourvalleys_unaccent(ca.label)), search.query) >= 0.22
                )
            )
          )
      ),
      filtered_businesses as (
        select *, count(*) over () as total_count
        from ranked_businesses
        where (
          ${radiusKm}::double precision is null
          or (distance_km is not null and distance_km <= ${radiusKm}::double precision)
        )
      )
      select *
      from filtered_businesses
      order by
        case when ${radiusKm}::double precision is not null then distance_km end asc nulls last,
        case when ${radiusKm}::double precision is null then relevance_score end desc nulls last,
        trading_name asc,
        id asc
      limit ${pageSize}
      offset ${offset}
    `;

    if (rows.length === 0 && page > 1) {
      return listPublishedBusinesses({ ...input, page: 1, pageSize });
    }

    const total = Number(rows[0]?.total_count ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const businesses: PublicBusinessSummary[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      tradingName: row.trading_name,
      welshName: row.welsh_name,
      summary: row.summary,
      category: { name: row.category_name, slug: row.category_slug },
      place: { name: row.place_name, slug: row.place_slug },
      verificationStatus: toVerificationStatus(row.verification_status),
      isDemo: row.is_demo,
      updatedAt: row.updated_at,
      rating: {
        average: row.rating_average != null ? Number(row.rating_average) : null,
        count: Number(row.rating_count),
      },
      cardImage: resolveCardImage(row),
      distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    }));

    return {
      state: "ready",
      businesses,
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
      businesses: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }
}

export type CategoryWithBusinessCount = {
  slug: string;
  name: string;
  welshLabel: string | null;
  count: number;
};

/**
 * Categories that currently have at least one published business, optionally
 * scoped to a place. Powers zero-result "related category" suggestions
 * without inventing categories that would just lead to another dead end.
 */
export async function listCategoriesWithPublishedBusinesses(
  input: { placeSlug?: string; limit?: number } = {},
): Promise<CategoryWithBusinessCount[]> {
  const limit = Math.min(Math.max(Math.floor(input.limit ?? 6), 1), 20);
  const placeSlug = normaliseSearchValue(input.placeSlug) ?? null;

  try {
    const database = getDatabase();
    const businessCount = sql<number>`count(distinct ${business.id})`;

    const rows = await database
      .select({
        slug: category.slug,
        name: category.name,
        welshLabel: category.welshLabel,
        count: sql<number>`${businessCount}::int`,
      })
      .from(category)
      .innerJoin(business, eq(business.primaryCategoryId, category.id))
      .innerJoin(
        businessPublication,
        and(
          eq(businessPublication.businessId, business.id),
          eq(businessPublication.status, "published"),
          isNotNull(businessPublication.publishedAt),
        ),
      )
      .innerJoin(
        businessLocation,
        and(
          eq(businessLocation.businessId, business.id),
          eq(businessLocation.isPrimary, true),
          eq(businessLocation.status, "active"),
        ),
      )
      .innerJoin(
        place,
        and(eq(place.id, businessLocation.placeId), eq(place.status, "active")),
      )
      .where(
        and(
          eq(category.status, "active"),
          eq(business.status, "published"),
          isNull(business.suspendedAt),
          placeSlug ? eq(place.slug, placeSlug) : undefined,
        ),
      )
      .groupBy(category.id)
      .orderBy(desc(businessCount), asc(category.name))
      .limit(limit);

    return rows;
  } catch {
    return [];
  }
}

export type PublicBusinessIdentity = {
  id: string;
  tradingName: string;
} | null;

/**
 * Minimal lookup used by the public content-report form: just enough to
 * confirm the business exists and show its name, without exposing any
 * other public-page data.
 */
export async function getBusinessIdentityById(
  businessId: string,
): Promise<PublicBusinessIdentity> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({ id: business.id, tradingName: business.tradingName })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * Looks up a business's currently published detail by id rather than slug,
 * for owner-facing views (such as the dashboard draft preview) that only
 * know the business id. Returns "missing" if the business has never
 * published, exactly like `getPublishedBusinessBySlug`.
 */
export async function getPublishedBusinessById(
  businessId: string,
): Promise<PublicBusinessResult> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({ slug: business.slug })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);
    if (!row) return { state: "missing", business: null };
    return getPublishedBusinessBySlug(row.slug);
  } catch {
    return { state: "unavailable", business: null };
  }
}

export async function getPublishedBusinessBySlug(
  slugInput: string,
): Promise<PublicBusinessResult> {
  const slug = normaliseSearchValue(slugInput);
  if (!slug) return { state: "missing", business: null };

  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        id: business.id,
        slug: business.slug,
        tradingName: business.tradingName,
        welshName: business.welshName,
        summary: business.summary,
        description: business.description,
        publicPhone: business.publicPhone,
        publicEmail: business.publicEmail,
        businessType: business.businessType,
        categoryName: category.name,
        categorySlug: category.slug,
        placeName: place.canonicalName,
        placeSlug: place.slug,
        locationType: businessLocation.locationType,
        publicAddressLineOne: businessLocation.publicAddressLineOne,
        publicLocality: businessLocation.publicLocality,
        publicPostcode: businessLocation.publicPostcode,
        addressVisibility: businessLocation.publicAddressVisibility,
        verificationStatus: business.verificationSummaryStatus,
        isDemo: business.isDemo,
        updatedAt: business.updatedAt,
        locationId: businessLocation.id,
        templateKey: businessSite.templateKey,
        platformPath: businessSite.platformPath,
        publishedAt: businessPublication.publishedAt,
      })
      .from(business)
      .innerJoin(
        businessPublication,
        eq(businessPublication.businessId, business.id),
      )
      .innerJoin(
        businessSite,
        and(
          eq(businessSite.id, businessPublication.businessSiteId),
          eq(businessSite.businessId, business.id),
        ),
      )
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
      .where(
        and(
          eq(business.slug, slug),
          eq(business.status, "published"),
          isNull(business.suspendedAt),
          eq(businessPublication.status, "published"),
          isNotNull(businessPublication.publishedAt),
          eq(businessSite.status, "published"),
          isNotNull(businessSite.publishedAt),
          eq(category.status, "active"),
          eq(place.status, "active"),
        ),
      )
      .limit(1);

    if (!row || !row.publishedAt) {
      return { state: "missing", business: null };
    }

    const [services, hours, ratingSummary, attributesRow] = await Promise.all([
      database
        .select({
          id: service.id,
          name: service.name,
          description: service.description,
          priceDisplay: service.priceDisplay,
        })
        .from(service)
        .where(
          and(eq(service.businessId, row.id), eq(service.status, "active")),
        )
        .orderBy(asc(service.sortOrder)),
      database
        .select({
          dayOfWeek: openingHoursRule.dayOfWeek,
          opensAt: openingHoursRule.opensAt,
          closesAt: openingHoursRule.closesAt,
          isClosed: openingHoursRule.isClosed,
        })
        .from(openingHoursRule)
        .where(eq(openingHoursRule.businessLocationId, row.locationId))
        .orderBy(asc(openingHoursRule.dayOfWeek)),
      getBusinessRatingSummary(row.id),
      database
        .select()
        .from(businessAttributes)
        .where(eq(businessAttributes.businessId, row.id))
        .limit(1),
    ]);

    const addressParts = [
      row.publicAddressLineOne,
      row.publicLocality,
      row.publicPostcode,
    ].filter((part): part is string => Boolean(part));
    const locationDisplay =
      row.addressVisibility === "full_address" && addressParts.length > 0
        ? addressParts.join(", ")
        : `Serving ${row.placeName} and nearby communities`;

    const publicBusiness: PublicBusinessDetail = {
      id: row.id,
      slug: row.slug,
      tradingName: row.tradingName,
      welshName: row.welshName,
      summary: row.summary,
      description: row.description,
      publicPhone: row.publicPhone,
      publicEmail: row.publicEmail,
      businessType: row.businessType,
      category: { name: row.categoryName, slug: row.categorySlug },
      place: { name: row.placeName, slug: row.placeSlug },
      verificationStatus: toVerificationStatus(row.verificationStatus),
      isDemo: row.isDemo,
      updatedAt: row.updatedAt,
      rating: ratingSummary,
      distanceKm: null,
      location: {
        type: row.locationType,
        display: locationDisplay,
        addressVisibility: row.addressVisibility,
      },
      site: {
        templateKey: row.templateKey,
        platformPath: row.platformPath,
        publishedAt: row.publishedAt,
      },
      services,
      openingHours: hours.map((hour) => ({
        day: dayNames[hour.dayOfWeek] ?? "Unknown",
        display:
          hour.isClosed || !hour.opensAt || !hour.closesAt
            ? "Closed"
            : `${hour.opensAt}–${hour.closesAt}`,
      })),
      attributes: attributesRow[0]
        ? {
            stepFreeAccess: attributesRow[0].stepFreeAccess,
            accessibleToilet: attributesRow[0].accessibleToilet,
            hearingLoop: attributesRow[0].hearingLoop,
            welshSpeaking: attributesRow[0].welshSpeaking,
            deliveryAvailable: attributesRow[0].deliveryAvailable,
            collectionAvailable: attributesRow[0].collectionAvailable,
            emergencyAvailable: attributesRow[0].emergencyAvailable,
            appointmentRequired: attributesRow[0].appointmentRequired,
          }
        : null,
    };

    return { state: "ready", business: publicBusiness };
  } catch {
    return { state: "unavailable", business: null };
  }
}
