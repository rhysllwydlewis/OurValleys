import "server-only";
import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
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

function normaliseSearchValue(value: string | undefined): string | undefined {
  const normalised = value?.trim().slice(0, 80);
  return normalised ? normalised : undefined;
}

function toVerificationStatus(value: string): "unverified" | "verified" {
  return value === "verified" ? "verified" : "unverified";
}

export async function listPublishedBusinesses(
  input: BusinessDirectoryFilters = {},
): Promise<BusinessDirectoryResult> {
  try {
    const database = getDatabase();
    const query = normaliseSearchValue(input.query);
    const categorySlug = normaliseSearchValue(input.category);
    const placeSlug = normaliseSearchValue(input.place);
    const filters: SQL[] = [
      eq(business.status, "published"),
      eq(businessPublication.status, "published"),
      eq(businessLocation.status, "active"),
      eq(businessLocation.isPrimary, true),
    ];

    if (query) {
      const pattern = `%${query}%`;
      filters.push(
        or(
          ilike(business.tradingName, pattern),
          ilike(business.summary, pattern),
          ilike(category.name, pattern),
        )!,
      );
    }

    if (categorySlug) {
      filters.push(eq(category.slug, categorySlug));
    }

    if (placeSlug) {
      filters.push(eq(place.slug, placeSlug));
    }

    const rows = await database
      .select({
        id: business.id,
        slug: business.slug,
        tradingName: business.tradingName,
        summary: business.summary,
        categoryName: category.name,
        categorySlug: category.slug,
        placeName: place.canonicalName,
        placeSlug: place.slug,
        verificationStatus: business.verificationSummaryStatus,
        isDemo: business.isDemo,
        updatedAt: business.updatedAt,
      })
      .from(business)
      .innerJoin(
        businessPublication,
        eq(businessPublication.businessId, business.id),
      )
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .innerJoin(businessLocation, eq(businessLocation.businessId, business.id))
      .innerJoin(place, eq(place.id, businessLocation.placeId))
      .where(and(...filters))
      .orderBy(asc(business.tradingName))
      .limit(50);

    const businesses: PublicBusinessSummary[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      tradingName: row.tradingName,
      summary: row.summary,
      category: { name: row.categoryName, slug: row.categorySlug },
      place: { name: row.placeName, slug: row.placeSlug },
      verificationStatus: toVerificationStatus(row.verificationStatus),
      isDemo: row.isDemo,
      updatedAt: row.updatedAt,
    }));

    return { state: "ready", businesses };
  } catch {
    return { state: "unavailable", businesses: [] };
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
        eq(businessSite.id, businessPublication.businessSiteId),
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
          eq(businessPublication.status, "published"),
          eq(businessSite.status, "published"),
        ),
      )
      .limit(1);

    if (!row || !row.publishedAt) {
      return { state: "missing", business: null };
    }

    const [services, hours] = await Promise.all([
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
    };

    return { state: "ready", business: publicBusiness };
  } catch {
    return { state: "unavailable", business: null };
  }
}
