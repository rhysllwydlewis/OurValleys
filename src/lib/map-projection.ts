import { haversineDistanceKm, type Coordinate } from "@/lib/geo";

/**
 * Pure helpers shared by the valleys map, the place mini-map and "near me".
 * Positions come from public locality centroids only, so nothing here can
 * reveal an address. Drawing on the map's own frame lives in
 * `valleys-geography.ts`.
 */

export type MapPoint = Coordinate & { key: string };

export type ProjectedPoint = { key: string; x: number; y: number };

export type MapProjection = {
  width: number;
  height: number;
  points: ProjectedPoint[];
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Locality centroids can coincide or sit a few hundred metres apart, which
 * would stack bubbles so one can never be chosen. Points closer than
 * `minGap` are nudged outward along a spiral until they are free. The order
 * is by key, so the layout is the same on server and client and between
 * renders. Nudges are small and stay inside the canvas.
 */
export function separatePoints(
  points: ProjectedPoint[],
  minGap: number,
  width: number,
  height: number,
): ProjectedPoint[] {
  if (minGap <= 0) return points;
  const placed: ProjectedPoint[] = [];
  const result = new Map<string, ProjectedPoint>();
  const clamp = (value: number, max: number) =>
    Math.min(Math.max(value, minGap / 2), max - minGap / 2);

  for (const point of [...points].sort((a, b) => a.key.localeCompare(b.key))) {
    let candidate = point;
    for (let step = 1; step <= 60; step += 1) {
      const clear = placed.every(
        (other) =>
          Math.hypot(other.x - candidate.x, other.y - candidate.y) >= minGap,
      );
      if (clear) break;
      const distance = minGap * 0.55 * Math.sqrt(step);
      candidate = {
        key: point.key,
        x: round(
          clamp(point.x + Math.cos(step * GOLDEN_ANGLE) * distance, width),
        ),
        y: round(
          clamp(point.y + Math.sin(step * GOLDEN_ANGLE) * distance, height),
        ),
      };
    }
    placed.push(candidate);
    result.set(point.key, candidate);
  }

  return points.map((point) => result.get(point.key) ?? point);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Bubble radius in viewBox units: area grows with the business count. */
export function bubbleRadius(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 5;
  return Math.round(Math.min(10 + Math.sqrt(count) * 5, 38) * 10) / 10;
}

export type NearestPlace = {
  key: string;
  distanceKm: number;
};

/**
 * Nearest points to a position by great-circle distance. Invalid coordinates
 * (NaN, out of range) return nothing rather than a misleading answer.
 */
export function nearestPoints(
  origin: Coordinate,
  points: readonly MapPoint[],
  limit = 3,
): NearestPlace[] {
  if (
    !Number.isFinite(origin.latitude) ||
    !Number.isFinite(origin.longitude) ||
    Math.abs(origin.latitude) > 90 ||
    Math.abs(origin.longitude) > 180
  ) {
    return [];
  }

  return points
    .map((point) => ({
      key: point.key,
      distanceKm: haversineDistanceKm(origin, point),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.key.localeCompare(b.key))
    .slice(0, Math.max(0, limit));
}

/** Beyond this the visitor is plainly outside the area the map covers. */
export const OUTSIDE_AREA_KM = 60;

/** Stable hue (0-359) for a valley so its colour never changes between loads. */
export function regionHue(slug: string): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  // Keep to the green, teal, blue and warm-gold range of the palette.
  const palette = [158, 172, 196, 214, 38, 24, 140, 258];
  return palette[hash % palette.length]!;
}
