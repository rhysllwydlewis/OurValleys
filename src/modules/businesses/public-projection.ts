import type { PublicBusiness } from "./types";

type BusinessPublicRow = {
  id: string;
  slug: string;
  tradingName: string;
  summary: string;
  description: string | null;
  locationType: PublicBusiness["locationType"];
  publicEmail: string | null;
  publicPhone: string | null;
  publicWebsite: string | null;
  publicAddress: string | null;
  serviceRadiusKm: string | null;
  languages: string[];
  accessibility: string[];
  publishedAt: Date | null;
  updatedAt: Date;
  categorySlug: string;
  categoryName: string;
  placeSlug: string | null;
  placeName: string | null;
};

export function toPublicBusinessProjection(
  row: BusinessPublicRow,
  services: PublicBusiness["services"] = [],
): PublicBusiness {
  return {
    id: row.id,
    slug: row.slug,
    tradingName: row.tradingName,
    summary: row.summary,
    description: row.description,
    category: { slug: row.categorySlug, name: row.categoryName },
    place:
      row.placeSlug && row.placeName
        ? { slug: row.placeSlug, name: row.placeName }
        : null,
    locationType: row.locationType,
    publicEmail: row.publicEmail,
    publicPhone: row.publicPhone,
    publicWebsite: row.publicWebsite,
    publicAddress: row.publicAddress,
    serviceRadiusKm: row.serviceRadiusKm === null ? null : Number(row.serviceRadiusKm),
    languages: [...row.languages],
    accessibility: [...row.accessibility],
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    services,
  };
}
