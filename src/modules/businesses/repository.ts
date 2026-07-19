import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/database/client";
import { businessServices, businesses, categories, places } from "@/lib/database/schema";
import { toPublicBusinessProjection } from "./public-projection";
import type { PublicBusiness } from "./types";

const publicBusinessSelection = {
  id: businesses.id,
  slug: businesses.slug,
  tradingName: businesses.tradingName,
  summary: businesses.summary,
  description: businesses.description,
  locationType: businesses.locationType,
  publicEmail: businesses.publicEmail,
  publicPhone: businesses.publicPhone,
  publicWebsite: businesses.publicWebsite,
  publicAddress: businesses.publicAddress,
  serviceRadiusKm: businesses.serviceRadiusKm,
  languages: businesses.languages,
  accessibility: businesses.accessibility,
  publishedAt: businesses.publishedAt,
  updatedAt: businesses.updatedAt,
  categorySlug: categories.slug,
  categoryName: categories.nameEn,
  placeSlug: places.slug,
  placeName: places.nameEn,
};

export async function findPublishedBusinessBySlug(slug: string): Promise<PublicBusiness | null> {
  const [row] = await db
    .select(publicBusinessSelection)
    .from(businesses)
    .innerJoin(categories, eq(businesses.primaryCategoryId, categories.id))
    .leftJoin(places, eq(businesses.placeId, places.id))
    .where(and(eq(businesses.slug, slug), eq(businesses.status, "published")))
    .limit(1);
  if (!row) return null;

  const services = await db
    .select({
      id: businessServices.id,
      name: businessServices.name,
      description: businessServices.description,
      priceLabel: businessServices.priceLabel,
    })
    .from(businessServices)
    .where(eq(businessServices.businessId, row.id))
    .orderBy(asc(businessServices.sortOrder), asc(businessServices.name));
  return toPublicBusinessProjection(row, services);
}

export async function searchPublishedBusinesses(input: {
  query?: string;
  place?: string;
  category?: string;
  limit?: number;
}): Promise<PublicBusiness[]> {
  const query = input.query?.trim();
  const conditions = [eq(businesses.status, "published")];
  if (query) {
    const textMatch = or(
      ilike(businesses.tradingName, `%${query}%`),
      ilike(businesses.summary, `%${query}%`),
      ilike(categories.nameEn, `%${query}%`),
    );
    if (textMatch) conditions.push(textMatch);
  }
  if (input.place) conditions.push(eq(places.slug, input.place));
  if (input.category) conditions.push(eq(categories.slug, input.category));

  const rows = await db
    .select(publicBusinessSelection)
    .from(businesses)
    .innerJoin(categories, eq(businesses.primaryCategoryId, categories.id))
    .leftJoin(places, eq(businesses.placeId, places.id))
    .where(and(...conditions))
    .orderBy(asc(businesses.tradingName))
    .limit(Math.min(Math.max(input.limit ?? 24, 1), 50));
  return rows.map((row) => toPublicBusinessProjection(row));
}
