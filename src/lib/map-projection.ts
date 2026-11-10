import { haversineDistanceKm, type Coordinate } from "@/lib/geo";

/**
 * Pure helpers for the tile-free valleys map. Positions come from public
 * locality centroids only, so nothing here can reveal an address.
 */

export type MapPoint = Coordinate & { key: string };

export type ProjectedPoint = { key: string; x: number; y: number };

export type MapProjection = {
  width: number;
  height: number;
  points: ProjectedPoint[];
};

const MAP_WIDTH = 1000;
const DEFAULT_PADDING = 56;

/**
 * Equirectangular projection with a cos(latitude) correction on longitude so
 * distances look right at Welsh latitudes. The result fits a fixed-width
 * viewBox with padding; the height follows the data's aspect ratio (clamped
 * so a single point or a thin strip still gives a usable canvas).
 */
export function projectPoints(
  points: readonly MapPoint[],
  options: { minGap?: number; padding?: number } = {},
): MapProjection {
  const padding = options.padding ?? DEFAULT_PADDING;
  if (points.length === 0) {
    return { width: MAP_WIDTH, height: 600, points: [] };
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const midLat = (minLat + maxLat) / 2;
  const lngScale = Math.cos((midLat * Math.PI) / 180);

  const spanX = Math.max((maxLng - minLng) * lngScale, 0.02);
  const spanY = Math.max(maxLat - minLat, 0.02);
  const innerWidth = MAP_WIDTH - padding * 2;
  const scale = innerWidth / spanX;
  const rawHeight = spanY * scale + padding * 2;
  const height = Math.round(Math.min(Math.max(rawHeight, 360), 900));
  const innerHeight = height - padding * 2;
  // Fit both axes: shrink uniformly when the height was clamped.
  const fit = Math.min(1, innerHeight / (spanY * scale));
  const offsetX = (innerWidth - spanX * scale * fit) / 2;
  const offsetY = (innerHeight - spanY * scale * fit) / 2;

  const projected = points.map((point) => ({
    key: point.key,
    x: round(
      padding + offsetX + (point.longitude - minLng) * lngScale * scale * fit,
    ),
    y: round(padding + offsetY + (maxLat - point.latitude) * scale * fit),
  }));

  return {
    width: MAP_WIDTH,
    height,
    points: separate(projected, options.minGap ?? 0, MAP_WIDTH, height),
  };
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Locality centroids can coincide or sit a few hundred metres apart, which
 * would stack bubbles so one can never be chosen. Points closer than
 * `minGap` are nudged outward along a spiral until they are free. The order
 * is by key, so the layout is the same on server and client and between
 * renders. Nudges are small and stay inside the canvas.
 */
function separate(
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

export type RegionShape = {
  /** Closed SVG path for the soft outline. Empty when there are no points. */
  path: string;
  /** Mean position of the points, where a region's label sits. */
  centre: { x: number; y: number };
  /** Bounding box of the outline, for focusing the map on one region. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

type Vertex = { x: number; y: number };

function cross(o: Vertex, a: Vertex, b: Vertex): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Convex hull by Andrew's monotone chain; collinear points are dropped. */
export function convexHull(points: readonly Vertex[]): Vertex[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const unique = sorted.filter(
    (point, index) =>
      index === 0 ||
      point.x !== sorted[index - 1]!.x ||
      point.y !== sorted[index - 1]!.y,
  );
  if (unique.length <= 2) return unique;
  const lower: Vertex[] = [];
  for (const point of unique) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0
    ) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper: Vertex[] = [];
  for (const point of [...unique].reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0
    ) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

const OUTLINE_STEPS = 14;

/**
 * A soft, rounded outline around a group of points: the hull of a circle of
 * `padding` around every point, drawn as a smooth closed curve. It is an
 * honest "these places belong together" shape, not a boundary: nothing here
 * claims to be a surveyed edge. One point gives a circle and two a capsule.
 */
export function regionShape(
  points: readonly Vertex[],
  padding: number,
): RegionShape | null {
  const valid = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  if (valid.length === 0 || !(padding > 0)) return null;

  const ring: Vertex[] = [];
  for (const point of valid) {
    for (let step = 0; step < OUTLINE_STEPS; step += 1) {
      const angle = (step / OUTLINE_STEPS) * Math.PI * 2;
      ring.push({
        x: point.x + Math.cos(angle) * padding,
        y: point.y + Math.sin(angle) * padding,
      });
    }
  }
  const hull = convexHull(ring);
  const mid = (a: Vertex, b: Vertex): Vertex => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });
  const last = hull[hull.length - 1]!;
  const start = mid(last, hull[0]!);
  let path = `M ${round(start.x)} ${round(start.y)}`;
  for (let index = 0; index < hull.length; index += 1) {
    const corner = hull[index]!;
    const end = mid(corner, hull[(index + 1) % hull.length]!);
    path += ` Q ${round(corner.x)} ${round(corner.y)} ${round(end.x)} ${round(end.y)}`;
  }
  path += " Z";

  const xs = hull.map((vertex) => vertex.x);
  const ys = hull.map((vertex) => vertex.y);
  return {
    path,
    centre: {
      x: round(valid.reduce((sum, point) => sum + point.x, 0) / valid.length),
      y: round(valid.reduce((sum, point) => sum + point.y, 0) / valid.length),
    },
    bounds: {
      minX: round(Math.min(...xs)),
      minY: round(Math.min(...ys)),
      maxX: round(Math.max(...xs)),
      maxY: round(Math.max(...ys)),
    },
  };
}

/**
 * A viewBox that frames `bounds` with the same aspect ratio as the full map,
 * never tighter than `minShare` of its width so a one-place valley is not
 * magnified absurdly.
 */
export function focusViewBox(
  bounds: RegionShape["bounds"],
  full: { width: number; height: number },
  minShare = 0.34,
): { x: number; y: number; width: number; height: number } {
  const aspect = full.height / full.width;
  const wantedWidth = Math.max(
    bounds.maxX - bounds.minX,
    (bounds.maxY - bounds.minY) / aspect,
    full.width * minShare,
  );
  const width = Math.min(wantedWidth * 1.08, full.width);
  const height = width * aspect;
  const centreX = (bounds.minX + bounds.maxX) / 2;
  const centreY = (bounds.minY + bounds.maxY) / 2;
  const x = Math.min(Math.max(centreX - width / 2, 0), full.width - width);
  const y = Math.min(Math.max(centreY - height / 2, 0), full.height - height);
  return {
    x: round(x),
    y: round(y),
    width: round(width),
    height: round(height),
  };
}

/** Stable hue (0-359) for a valley so its colour never changes between loads. */
export function regionHue(slug: string): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  // Keep to the green, teal, blue and warm-gold range of the palette.
  const palette = [158, 172, 196, 214, 38, 24, 140, 258];
  return palette[hash % palette.length]!;
}
