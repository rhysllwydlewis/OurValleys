import { describe, expect, it } from "vitest";
import {
  bubbleRadius,
  convexHull,
  focusViewBox,
  regionHue,
  regionShape,
  nearestPoints,
  projectPoints,
  type MapPoint,
} from "@/lib/map-projection";

const points: MapPoint[] = [
  { key: "pontypridd", latitude: 51.6, longitude: -3.34 },
  { key: "treorchy", latitude: 51.66, longitude: -3.5 },
  { key: "merthyr", latitude: 51.75, longitude: -3.38 },
];

describe("projectPoints", () => {
  it("keeps every point inside the padded canvas, north up and west left", () => {
    const projection = projectPoints(points);
    const byKey = Object.fromEntries(projection.points.map((p) => [p.key, p]));
    for (const point of projection.points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(projection.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(projection.height);
    }
    expect(byKey.merthyr!.y).toBeLessThan(byKey.pontypridd!.y);
    expect(byKey.treorchy!.x).toBeLessThan(byKey.pontypridd!.x);
  });

  it("handles no points and a single point without NaN", () => {
    expect(projectPoints([]).points).toEqual([]);
    const [only] = projectPoints([points[0]!]).points;
    expect(Number.isFinite(only!.x)).toBe(true);
    expect(Number.isFinite(only!.y)).toBe(true);
  });

  it("clamps the canvas height for a very tall strip", () => {
    const strip: MapPoint[] = [
      { key: "a", latitude: 51, longitude: -3 },
      { key: "b", latitude: 53, longitude: -3 },
    ];
    const projection = projectPoints(strip);
    expect(projection.height).toBeLessThanOrEqual(900);
    for (const point of projection.points) {
      expect(point.y).toBeLessThanOrEqual(projection.height);
    }
  });
});

describe("projectPoints separation", () => {
  const crowded: MapPoint[] = [
    { key: "taff-valley", latitude: 51.6, longitude: -3.34 },
    { key: "pontypridd", latitude: 51.6, longitude: -3.34 },
    { key: "rhondda", latitude: 51.6003, longitude: -3.3401 },
    { key: "far", latitude: 51.75, longitude: -3.5 },
  ];

  it("keeps coincident places at least minGap apart and inside the canvas", () => {
    const projection = projectPoints(crowded, { minGap: 20 });
    for (const a of projection.points) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(projection.width);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(projection.height);
      for (const b of projection.points) {
        if (a.key === b.key) continue;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it("is deterministic and independent of input order", () => {
    const forward = projectPoints(crowded, { minGap: 20 });
    const backward = projectPoints([...crowded].reverse(), { minGap: 20 });
    const byKey = (items: typeof forward.points) =>
      Object.fromEntries(items.map((item) => [item.key, [item.x, item.y]]));
    expect(byKey(backward.points)).toEqual(byKey(forward.points));
  });

  it("leaves positions untouched without a gap and moves an isolated point not at all", () => {
    const plain = projectPoints(crowded);
    const gap = projectPoints(crowded, { minGap: 20 });
    const far = (items: typeof plain.points) =>
      items.find((item) => item.key === "far");
    expect(far(gap.points)).toEqual(far(plain.points));
  });
});

describe("bubbleRadius", () => {
  it("grows with the count, is bounded and tolerates bad input", () => {
    expect(bubbleRadius(0)).toBe(5);
    expect(bubbleRadius(-3)).toBe(5);
    expect(bubbleRadius(Number.NaN)).toBe(5);
    expect(bubbleRadius(4)).toBeGreaterThan(bubbleRadius(1));
    expect(bubbleRadius(100000)).toBe(38);
  });
});

describe("nearestPoints", () => {
  it("orders by distance and respects the limit", () => {
    const result = nearestPoints(
      { latitude: 51.61, longitude: -3.35 },
      points,
      2,
    );
    expect(result.map((item) => item.key)).toEqual(["pontypridd", "treorchy"]);
    expect(result[0]!.distanceKm).toBeLessThan(2);
  });

  it("returns nothing for invalid coordinates", () => {
    expect(
      nearestPoints({ latitude: Number.NaN, longitude: 0 }, points),
    ).toEqual([]);
    expect(nearestPoints({ latitude: 95, longitude: 0 }, points)).toEqual([]);
    expect(nearestPoints({ latitude: 0, longitude: 200 }, points)).toEqual([]);
  });
});

describe("convexHull", () => {
  it("keeps the corners and drops interior and duplicate points", () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 5 },
      { x: 5, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ x: 5, y: 5 });
  });

  it("returns what it was given when there is no area to enclose", () => {
    expect(convexHull([])).toEqual([]);
    expect(convexHull([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
  });
});

describe("regionShape", () => {
  it("draws a closed outline that contains every point with padding", () => {
    const shape = regionShape(
      [
        { x: 100, y: 100 },
        { x: 300, y: 140 },
        { x: 200, y: 260 },
      ],
      30,
    );
    expect(shape).not.toBeNull();
    expect(shape!.path.startsWith("M ")).toBe(true);
    expect(shape!.path.endsWith("Z")).toBe(true);
    expect(shape!.path).not.toContain("NaN");
    expect(shape!.bounds.minX).toBeLessThanOrEqual(70);
    expect(shape!.bounds.maxX).toBeGreaterThanOrEqual(330);
    expect(shape!.bounds.minY).toBeLessThanOrEqual(72);
    expect(shape!.bounds.maxY).toBeGreaterThanOrEqual(288);
    expect(shape!.centre).toEqual({ x: 200, y: 166.7 });
  });

  it("gives a single place a round outline and ignores unusable input", () => {
    const one = regionShape([{ x: 50, y: 50 }], 20);
    expect(one!.bounds.maxX - one!.bounds.minX).toBeGreaterThan(36);
    expect(regionShape([], 20)).toBeNull();
    expect(regionShape([{ x: 1, y: 1 }], 0)).toBeNull();
    expect(regionShape([{ x: Number.NaN, y: 1 }], 10)).toBeNull();
  });
});

describe("focusViewBox", () => {
  const full = { width: 1000, height: 600 };

  it("keeps the full map's aspect ratio and stays on the canvas", () => {
    const box = focusViewBox(
      { minX: 700, minY: 400, maxX: 990, maxY: 590 },
      full,
    );
    expect(box.height / box.width).toBeCloseTo(0.6, 1);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1000.1);
    expect(box.y + box.height).toBeLessThanOrEqual(600.1);
  });

  it("does not magnify a tiny region beyond the minimum share", () => {
    const box = focusViewBox(
      { minX: 400, minY: 300, maxX: 420, maxY: 310 },
      full,
    );
    expect(box.width).toBeGreaterThanOrEqual(340);
  });

  it("never exceeds the full map", () => {
    const box = focusViewBox(
      { minX: -50, minY: -50, maxX: 1200, maxY: 900 },
      full,
    );
    expect(box).toEqual({ x: 0, y: 0, width: 1000, height: 600 });
  });
});

describe("regionHue", () => {
  it("is stable per valley and always a valid hue", () => {
    expect(regionHue("rhondda-fawr")).toBe(regionHue("rhondda-fawr"));
    for (const slug of ["a", "cynon-valley", "ebbw-valley", ""]) {
      const hue = regionHue(slug);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});
