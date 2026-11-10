import {
  bubbleRadius,
  projectPoints,
  regionHue,
  regionShape,
} from "@/lib/map-projection";
import type { MapPlace, MapValley } from "@/modules/businesses/map";

/**
 * Pure builder for the small map on a place page: the valley a place sits in,
 * drawn as a soft outline with its places as dots. Positions are public
 * locality centroids, so nothing here can reveal an address.
 */

export const MINIMAP_WIDTH = 1000;

export type MiniMapDot = {
  slug: string;
  name: string;
  welshName: string | null;
  x: number;
  y: number;
  radius: number;
  businessCount: number;
  current: boolean;
};

export type PlaceMiniMap = {
  valley: Pick<MapValley, "slug" | "name" | "welshName">;
  hue: number;
  width: number;
  height: number;
  regionPath: string;
  dots: MiniMapDot[];
  /** Dot slug whose label is drawn (the current place, else the biggest). */
  placeCount: number;
  businessCount: number;
};

export type ValleyGlanceRow = {
  slug: string;
  name: string;
  welshName: string | null;
  businessCount: number;
  /** Share of the biggest place, 0-1, for a proportional bar. */
  share: number;
  current: boolean;
};

export type ValleyGlance = {
  rows: ValleyGlanceRow[];
  categories: Array<{
    slug: string;
    name: string;
    welshLabel: string | null;
    count: number;
  }>;
};

/** The valley a page is about: the place itself when it is a valley. */
export function resolveValleySlug(
  slug: string,
  places: readonly Pick<MapPlace, "slug" | "valleySlug">[],
  valleys: readonly Pick<MapValley, "slug">[],
): string | null {
  const own = places.find((place) => place.slug === slug);
  if (own?.valleySlug) return own.valleySlug;
  return valleys.some((valley) => valley.slug === slug) ? slug : null;
}

export function buildPlaceMiniMap(
  currentSlug: string,
  places: readonly MapPlace[],
  valleys: readonly MapValley[],
): PlaceMiniMap | null {
  const valleySlug = resolveValleySlug(currentSlug, places, valleys);
  if (!valleySlug) return null;
  const valley = valleys.find((entry) => entry.slug === valleySlug);
  if (!valley) return null;
  const members = places.filter((place) => place.valleySlug === valleySlug);
  if (members.length === 0) return null;

  const projection = projectPoints(
    members.map((place) => ({
      key: place.slug,
      latitude: place.latitude,
      longitude: place.longitude,
    })),
    // Wide enough that neighbouring dots (and their touch targets) never overlap.
    { padding: 70, minGap: 64 },
  );
  const positions = new Map(projection.points.map((p) => [p.key, p]));
  const dots: MiniMapDot[] = members.flatMap((place) => {
    const point = positions.get(place.slug);
    if (!point) return [];
    return [
      {
        slug: place.slug,
        name: place.name,
        welshName: place.welshName,
        x: point.x,
        y: point.y,
        radius: Math.min(bubbleRadius(place.businessCount), 30),
        businessCount: place.businessCount,
        current: place.slug === currentSlug,
      },
    ];
  });
  const shape = regionShape(dots, 46);
  if (!shape) return null;
  // Draw the current place last so it sits above its neighbours.
  dots.sort((a, b) => Number(a.current) - Number(b.current));
  return {
    valley: {
      slug: valley.slug,
      name: valley.name,
      welshName: valley.welshName,
    },
    hue: regionHue(valley.slug),
    width: projection.width,
    height: projection.height,
    regionPath: shape.path,
    dots,
    placeCount: valley.placeCount,
    businessCount: valley.businessCount,
  };
}

const GLANCE_ROWS = 8;
const GLANCE_CATEGORIES = 5;

/** Places in a valley ranked by business count, and its commonest categories. */
export function buildValleyGlance(
  valleySlug: string,
  currentSlug: string,
  places: readonly MapPlace[],
): ValleyGlance | null {
  const members = places.filter((place) => place.valleySlug === valleySlug);
  if (members.length === 0) return null;
  const ranked = [...members].sort(
    (a, b) =>
      b.businessCount - a.businessCount || a.name.localeCompare(b.name, "en"),
  );
  const top = Math.max(ranked[0]?.businessCount ?? 0, 1);
  const rows = ranked.slice(0, GLANCE_ROWS).map((place) => ({
    slug: place.slug,
    name: place.name,
    welshName: place.welshName,
    businessCount: place.businessCount,
    share: Math.round((place.businessCount / top) * 100) / 100,
    current: place.slug === currentSlug,
  }));

  const totals = new Map<
    string,
    { slug: string; name: string; welshLabel: string | null; count: number }
  >();
  for (const place of members) {
    for (const category of place.topCategories) {
      const entry = totals.get(category.slug) ?? { ...category, count: 0 };
      entry.count += category.count;
      totals.set(category.slug, entry);
    }
  }
  const categories = [...totals.values()]
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en"))
    .slice(0, GLANCE_CATEGORIES);
  return { rows, categories };
}
