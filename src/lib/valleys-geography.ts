import geography from "@/data/geography/valleys-geography.json";
import type { Coordinate } from "@/lib/geo";
import {
  separatePoints,
  type MapPoint,
  type MapProjection,
} from "@/lib/map-projection";
import { toNationalGrid } from "@/lib/national-grid";

/**
 * The static geography behind the valleys map and the maths that goes with
 * it. The data file is baked from open data by
 * `scripts/geography/build_valleys_geography.py`; nothing is fetched from a
 * map provider at runtime. Everything is in "map units": one fixed frame of
 * the British National Grid, 1000 units wide.
 */

export type ValleyRiver = {
  /** Slug of the valley place this river defines. */
  slug: string;
  /** The river and its named branches, as an SVG path. */
  path: string;
  /** A smoothed centre line, left to right, for the name to follow. */
  spine: string;
  /** [minX, minY, maxX, maxY] of the river inside the frame. */
  bounds: number[];
};

export type ValleysGeography = {
  attribution: string;
  frame: {
    eastMin: number;
    northMax: number;
    metresPerUnit: number;
    width: number;
    height: number;
  };
  relief: { href: string; width: number; height: number };
  councils: Array<{
    name: string;
    welshName: string | null;
    covered: boolean;
    path: string;
  }>;
  lakes: string;
  riversMinor: string;
  riversMajor: string;
  valleys: ValleyRiver[];
  rail: string;
  roadsA: string;
  motorway: string;
};

export const valleysGeography: ValleysGeography = geography;

export const MAP_FRAME = {
  width: valleysGeography.frame.width,
  height: valleysGeography.frame.height,
} as const;

export type Vertex = { x: number; y: number };

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Position of a coordinate in map units. It may fall outside the frame. */
export function projectToFrame(coordinate: Coordinate): Vertex {
  const { eastMin, northMax, metresPerUnit } = valleysGeography.frame;
  const grid = toNationalGrid(coordinate);
  return {
    x: (grid.easting - eastMin) / metresPerUnit,
    y: (northMax - grid.northing) / metresPerUnit,
  };
}

/** True when a coordinate is valid and sits inside the map frame. */
export function isInsideFrame(coordinate: Coordinate): boolean {
  if (
    !Number.isFinite(coordinate.latitude) ||
    !Number.isFinite(coordinate.longitude)
  ) {
    return false;
  }
  const point = projectToFrame(coordinate);
  return (
    point.x >= 0 &&
    point.x <= MAP_FRAME.width &&
    point.y >= 0 &&
    point.y <= MAP_FRAME.height
  );
}

/**
 * Places at their true position on the map. A place outside the frame is
 * pulled to its edge so it can still be chosen, and places that share (or
 * nearly share) a centroid are nudged apart by `minGap`.
 */
export function projectPlaces(
  points: readonly MapPoint[],
  options: { minGap?: number; inset?: number } = {},
): MapProjection {
  const inset = options.inset ?? 12;
  const projected = points.map((point) => {
    const position = projectToFrame(point);
    return {
      key: point.key,
      x: round(Math.min(Math.max(position.x, inset), MAP_FRAME.width - inset)),
      y: round(Math.min(Math.max(position.y, inset), MAP_FRAME.height - inset)),
    };
  });
  return {
    width: MAP_FRAME.width,
    height: MAP_FRAME.height,
    points: separatePoints(
      projected,
      options.minGap ?? 0,
      MAP_FRAME.width,
      MAP_FRAME.height,
    ),
  };
}

/** The part of the frame on screen, in map units. */
export type MapView = { x: number; y: number; width: number; height: number };

/** Height over width of the frame itself. */
export const FRAME_ASPECT = MAP_FRAME.height / MAP_FRAME.width;

export const FULL_VIEW: MapView = {
  x: 0,
  y: 0,
  width: MAP_FRAME.width,
  height: MAP_FRAME.height,
};

/** The closest view is this many times narrower than the frame. */
export const MAX_ZOOM = 6;
const MIN_VIEW_WIDTH = MAP_FRAME.width / MAX_ZOOM;

function safeAspect(aspect: number): number {
  return Number.isFinite(aspect) && aspect > 0.2 && aspect < 5
    ? aspect
    : FRAME_ASPECT;
}

/**
 * The widest view that still fits inside the frame for a map drawn with the
 * given shape (`aspect` is height over width). A map taller than the frame,
 * as on a phone, cannot show the whole width at once.
 */
export function widestView(aspect: number): number {
  return Math.min(MAP_FRAME.width, MAP_FRAME.height / safeAspect(aspect));
}

/**
 * A view `width` map units wide centred on a point: never wider than fits,
 * never closer than `MAX_ZOOM`, never off the edge of the frame.
 */
export function viewAround(
  centre: Vertex,
  width: number,
  aspect: number = FRAME_ASPECT,
): MapView {
  const shape = safeAspect(aspect);
  const widest = widestView(shape);
  const wanted = Number.isFinite(width) ? width : widest;
  const clamped = Math.min(Math.max(wanted, MIN_VIEW_WIDTH), widest);
  const height = Math.min(clamped * shape, MAP_FRAME.height);
  const cx = Number.isFinite(centre.x) ? centre.x : MAP_FRAME.width / 2;
  const cy = Number.isFinite(centre.y) ? centre.y : MAP_FRAME.height / 2;
  return {
    x: round(
      Math.min(Math.max(cx - clamped / 2, 0), MAP_FRAME.width - clamped),
    ),
    y: round(Math.min(Math.max(cy - height / 2, 0), MAP_FRAME.height - height)),
    width: round(clamped),
    height: round(height),
  };
}

/**
 * Zoom by `factor` (above 1 zooms in) keeping `anchor` at the same place on
 * screen, so the map grows around the pointer or the middle of a pinch.
 */
export function zoomView(
  view: MapView,
  factor: number,
  anchor: Vertex,
): MapView {
  if (!(factor > 0) || !Number.isFinite(factor) || !(view.width > 0)) {
    return view;
  }
  const aspect = view.height / view.width;
  const width = Math.min(
    Math.max(view.width / factor, MIN_VIEW_WIDTH),
    widestView(aspect),
  );
  const share = width / view.width;
  const height = view.height * share;
  return viewAround(
    {
      x: anchor.x - (anchor.x - view.x) * share + width / 2,
      y: anchor.y - (anchor.y - view.y) * share + height / 2,
    },
    width,
    aspect,
  );
}

/** The closest view that holds every point, with breathing room. */
export function viewOfPoints(
  points: readonly Vertex[],
  aspect: number = FRAME_ASPECT,
  padding = 60,
  minShare = 0.3,
): MapView {
  const shape = safeAspect(aspect);
  const valid = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  if (valid.length === 0) {
    return viewAround(
      { x: MAP_FRAME.width / 2, y: MAP_FRAME.height / 2 },
      MAP_FRAME.width,
      shape,
    );
  }
  const xs = valid.map((point) => point.x);
  const ys = valid.map((point) => point.y);
  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;
  const width = Math.max(
    maxX - minX,
    (maxY - minY) / shape,
    MAP_FRAME.width * minShare,
  );
  return viewAround(
    { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    width,
    shape,
  );
}

/** The points of a spine path ("M x y x y ..."). */
export function parseSpine(spine: string): Vertex[] {
  const numbers = spine
    .replace(/^M/, "")
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const points: Vertex[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index]!, y: numbers[index + 1]! });
  }
  return points;
}

/**
 * Where along a line (0 to 1 of its length) the point nearest to `target`
 * sits, with the line's length. A valley's name is centred here so it sits
 * beside the valley's own places rather than half way to the sea.
 */
export function nearestOnLine(
  line: readonly Vertex[],
  target: Vertex,
): { share: number; length: number; point: Vertex } {
  if (line.length === 0) return { share: 0.5, length: 0, point: target };
  let travelled = 0;
  let best = { distance: Infinity, at: 0, point: line[0]! };
  for (let index = 1; index < line.length; index += 1) {
    const a = line[index - 1]!;
    const b = line[index]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segment = Math.hypot(dx, dy);
    const t =
      segment === 0
        ? 0
        : Math.min(
            Math.max(
              ((target.x - a.x) * dx + (target.y - a.y) * dy) /
                (segment * segment),
              0,
            ),
            1,
          );
    const point = { x: a.x + dx * t, y: a.y + dy * t };
    const distance = Math.hypot(target.x - point.x, target.y - point.y);
    if (distance < best.distance) {
      best = { distance, at: travelled + segment * t, point };
    }
    travelled += segment;
  }
  return {
    share: travelled === 0 ? 0.5 : best.at / travelled,
    length: travelled,
    point: best.point,
  };
}

/** The point a share (0 to 1) of the way along a line, and its direction. */
export function pointOnLine(
  line: readonly Vertex[],
  share: number,
): { point: Vertex; angle: number } | null {
  if (line.length < 2) return null;
  const lengths = line
    .slice(1)
    .map((point, index) =>
      Math.hypot(point.x - line[index]!.x, point.y - line[index]!.y),
    );
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (!(total > 0)) return null;
  let remaining = Math.min(Math.max(share, 0), 1) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index]!;
    if (remaining <= length || index === lengths.length - 1) {
      const a = line[index]!;
      const b = line[index + 1]!;
      const t = length === 0 ? 0 : Math.min(remaining / length, 1);
      return {
        point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
    remaining -= length;
  }
  return null;
}

export type LabelBox = { x0: number; y0: number; x1: number; y1: number };

/** True when two boxes overlap. */
export function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/** The upright box around text of a given size set at an angle. */
export function slantedBox(
  centre: Vertex,
  width: number,
  height: number,
  angle: number,
): LabelBox {
  const halfX =
    (Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height) /
    2;
  const halfY =
    (Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height) /
    2;
  return {
    x0: centre.x - halfX,
    x1: centre.x + halfX,
    y0: centre.y - halfY,
    y1: centre.y + halfY,
  };
}

export type LabelRequest = {
  key: string;
  /** Marker centre and radius, in map units. */
  x: number;
  y: number;
  radius: number;
  /** Size of the label's text box, in map units. */
  width: number;
  height: number;
  /** Higher is placed first. */
  priority: number;
  /** A forced label is always drawn, even if it has to overlap. */
  forced: boolean;
};

export type LabelPlacement = {
  /** Text position: `x` is the anchor point and `y` the baseline. */
  x: number;
  y: number;
  anchor: "middle" | "start" | "end";
};

type Box = LabelBox;
const overlaps = boxesOverlap;

/**
 * Chooses which place names to draw and where, so names never sit on each
 * other or on another place's marker. Each name tries below, right, left and
 * above its marker; important names go first and a name with no free spot is
 * left out (the marker is still there and still says its name to assistive
 * technology). `bounds` keeps names inside the visible map and `reserved`
 * holds space already given to something else, such as a valley's name.
 */
export function placeLabels(
  requests: readonly LabelRequest[],
  bounds: MapView,
  gap = 2,
  reserved: readonly LabelBox[] = [],
): Map<string, LabelPlacement> {
  const ordered = [...requests].sort(
    (a, b) =>
      Number(b.forced) - Number(a.forced) ||
      b.priority - a.priority ||
      a.key.localeCompare(b.key),
  );
  const markers = requests.map((request) => ({
    key: request.key,
    box: {
      x0: request.x - request.radius,
      y0: request.y - request.radius,
      x1: request.x + request.radius,
      y1: request.y + request.radius,
    },
  }));
  const taken: Box[] = [...reserved];
  const placed = new Map<string, LabelPlacement>();

  for (const request of ordered) {
    const { x, y, radius, width, height } = request;
    const ascent = height * 0.78;
    const candidates: Array<LabelPlacement & { box: Box }> = [
      {
        x,
        y: y + radius + gap + ascent,
        anchor: "middle",
        box: {
          x0: x - width / 2,
          x1: x + width / 2,
          y0: y + radius + gap,
          y1: y + radius + gap + height,
        },
      },
      {
        x: x + radius + gap * 2,
        y: y + ascent - height / 2,
        anchor: "start",
        box: {
          x0: x + radius + gap * 2,
          x1: x + radius + gap * 2 + width,
          y0: y - height / 2,
          y1: y + height / 2,
        },
      },
      {
        x: x - radius - gap * 2,
        y: y + ascent - height / 2,
        anchor: "end",
        box: {
          x0: x - radius - gap * 2 - width,
          x1: x - radius - gap * 2,
          y0: y - height / 2,
          y1: y + height / 2,
        },
      },
      {
        x,
        y: y - radius - gap - (height - ascent),
        anchor: "middle",
        box: {
          x0: x - width / 2,
          x1: x + width / 2,
          y0: y - radius - gap - height,
          y1: y - radius - gap,
        },
      },
    ];
    const inside = (box: Box) =>
      box.x0 >= bounds.x &&
      box.x1 <= bounds.x + bounds.width &&
      box.y0 >= bounds.y &&
      box.y1 <= bounds.y + bounds.height;
    const free = candidates.find(
      (candidate) =>
        inside(candidate.box) &&
        !taken.some((box) => overlaps(candidate.box, box)) &&
        !markers.some(
          (marker) =>
            marker.key !== request.key && overlaps(candidate.box, marker.box),
        ),
    );
    const chosen =
      free ??
      (request.forced
        ? (candidates.find((candidate) => inside(candidate.box)) ??
          candidates[0]!)
        : null);
    if (!chosen) continue;
    taken.push(chosen.box);
    placed.set(request.key, {
      x: round(chosen.x),
      y: round(chosen.y),
      anchor: chosen.anchor,
    });
  }
  return placed;
}

/**
 * A fixed label position. Rounded, because the server and the browser can
 * disagree in the last digits of the trigonometry and the markup must match.
 */
function labelAt(coordinate: Coordinate): Vertex {
  const point = projectToFrame(coordinate);
  return { x: round(point.x), y: round(point.y) };
}

/** Larger settlements and water named for context; none can be chosen. */
export const CONTEXT_LABELS: ReadonlyArray<{
  key: string;
  kind: "city" | "water" | "upland";
  name: string;
  welshName: string;
  position: Vertex;
  anchor: "middle" | "start" | "end";
}> = [
  {
    key: "cardiff",
    kind: "city",
    name: "Cardiff",
    welshName: "Caerdydd",
    position: labelAt({ latitude: 51.4816, longitude: -3.1791 }),
    anchor: "middle",
  },
  {
    key: "newport",
    kind: "city",
    name: "Newport",
    welshName: "Casnewydd",
    position: labelAt({ latitude: 51.5842, longitude: -2.9977 }),
    anchor: "middle",
  },
  {
    key: "swansea",
    kind: "city",
    name: "Swansea",
    welshName: "Abertawe",
    position: labelAt({ latitude: 51.6214, longitude: -3.9436 }),
    anchor: "start",
  },
  {
    key: "bristol-channel",
    kind: "water",
    name: "Bristol Channel",
    welshName: "Môr Hafren",
    position: { x: 264, y: 684 },
    anchor: "middle",
  },
  {
    key: "swansea-bay",
    kind: "water",
    name: "Swansea Bay",
    welshName: "Bae Abertawe",
    position: { x: 92, y: 462 },
    anchor: "middle",
  },
  {
    key: "bannau-brycheiniog",
    kind: "upland",
    name: "Bannau Brycheiniog",
    welshName: "Bannau Brycheiniog",
    position: { x: 458, y: 34 },
    anchor: "middle",
  },
];
