import { bubbleRadius, regionHue } from "@/lib/map-projection";
import {
  MAP_FRAME,
  placeLabels,
  projectPlaces,
  valleysGeography,
  viewOfPoints,
  type LabelPlacement,
  type MapView,
} from "@/lib/valleys-geography";
import type { MapPlace, MapValley } from "@/modules/businesses/map";

/**
 * Pure builder for the small map on a place page: the piece of the valleys
 * map (`docs/116-valleys-map-geography.md`) around the valley a place sits
 * in, with the valley's river and its places. Positions are public locality
 * centroids, so nothing here can reveal an address.
 */

/** The shape the mini-map is drawn in: height over width. */
export const MINIMAP_ASPECT = 0.64;
/** The width, in CSS pixels, that marker and type sizes are designed for. */
const DESIGN_WIDTH = 560;

export type MiniMapDot = {
  slug: string;
  name: string;
  welshName: string | null;
  /** Position, sizes and name position, all in map units. */
  x: number;
  y: number;
  radius: number;
  /** Radius of the invisible tap area; never overlaps a neighbour's. */
  hit: number;
  /** Where the name is drawn, or null when there is no room for it. */
  label: LabelPlacement | null;
  welshLabel: LabelPlacement | null;
  businessCount: number;
  current: boolean;
};

export type PlaceMiniMap = {
  valley: Pick<MapValley, "slug" | "name" | "welshName">;
  hue: number;
  /** The part of the valleys map shown, as an SVG viewBox. */
  view: MapView;
  /** Map units per designed pixel, for line and type sizes. */
  unit: number;
  /** The whole map's hill shading, of which `view` shows a part. */
  relief: { href: string; width: number; height: number };
  /** This valley's river, and the other valleys' rivers that cross the view. */
  river: string | null;
  otherRivers: string[];
  dots: MiniMapDot[];
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

  // True positions; places that share a centroid are nudged just apart.
  const projection = projectPlaces(
    members.map((place) => ({
      key: place.slug,
      latitude: place.latitude,
      longitude: place.longitude,
    })),
    { minGap: 12 },
  );
  const positions = new Map(projection.points.map((p) => [p.key, p]));
  const view = viewOfPoints(projection.points, MINIMAP_ASPECT, 42, 0.2);
  const unit = Math.round((view.width / DESIGN_WIDTH) * 1000) / 1000;

  const sized = members.flatMap((place) => {
    const point = positions.get(place.slug);
    if (!point) return [];
    const radius =
      (place.businessCount > 0
        ? Math.max(10, Math.min(bubbleRadius(place.businessCount) * 0.8, 24))
        : 5) * unit;
    return [{ place, point, radius }];
  });
  const labelsFor = (welsh: boolean) =>
    placeLabels(
      sized.map(({ place, point, radius }) => {
        const name = (welsh && place.welshName) || place.name;
        return {
          key: place.slug,
          x: point.x,
          y: point.y,
          radius,
          width: name.length * 13 * unit * 0.6,
          height: 13 * unit * 1.25,
          priority:
            Math.min(place.businessCount, 99) * 10 +
            (place.placeType === "town" ? 2 : 1),
          forced: place.slug === currentSlug,
        };
      }),
      view,
      2 * unit,
    );
  const labels = labelsFor(false);
  const welshLabels = labelsFor(true);

  const dots: MiniMapDot[] = sized.map(({ place, point, radius }) => {
    // Half way to the nearest neighbour, so tap areas never overlap.
    let nearest = Infinity;
    for (const other of sized) {
      if (other.place.slug === place.slug) continue;
      nearest = Math.min(
        nearest,
        Math.hypot(other.point.x - point.x, other.point.y - point.y),
      );
    }
    return {
      slug: place.slug,
      name: place.name,
      welshName: place.welshName,
      x: point.x,
      y: point.y,
      radius: round(radius),
      hit: round(Math.max(Math.min(16 * unit, nearest / 2), 3 * unit)),
      label: labels.get(place.slug) ?? null,
      welshLabel: welshLabels.get(place.slug) ?? null,
      businessCount: place.businessCount,
      current: place.slug === currentSlug,
    };
  });
  // Draw the current place last so it sits above its neighbours.
  dots.sort((a, b) => Number(a.current) - Number(b.current));

  const crosses = (bounds: number[]) =>
    bounds[0]! < view.x + view.width &&
    bounds[2]! > view.x &&
    bounds[1]! < view.y + view.height &&
    bounds[3]! > view.y;
  return {
    valley: {
      slug: valley.slug,
      name: valley.name,
      welshName: valley.welshName,
    },
    hue: regionHue(valley.slug),
    view,
    unit,
    relief: {
      href: valleysGeography.relief.href,
      width: MAP_FRAME.width,
      height: MAP_FRAME.height,
    },
    river:
      valleysGeography.valleys.find((river) => river.slug === valleySlug)
        ?.path ?? null,
    otherRivers: valleysGeography.valleys
      .filter((river) => river.slug !== valleySlug && crosses(river.bounds))
      .map((river) => river.path),
    dots,
    placeCount: valley.placeCount,
    businessCount: valley.businessCount,
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
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
