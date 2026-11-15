import { describe, expect, it } from "vitest";
import {
  bubbleRadius,
  regionHue,
  nearestPoints,
  separatePoints,
  type MapPoint,
} from "@/lib/map-projection";

const points: MapPoint[] = [
  { key: "pontypridd", latitude: 51.6, longitude: -3.34 },
  { key: "treorchy", latitude: 51.66, longitude: -3.5 },
  { key: "merthyr", latitude: 51.75, longitude: -3.38 },
];

describe("separatePoints", () => {
  const stacked = [
    { key: "a", x: 500, y: 300 },
    { key: "b", x: 500, y: 300 },
    { key: "c", x: 501, y: 300 },
  ];

  it("nudges stacked points apart, inside the canvas", () => {
    const apart = separatePoints(stacked, 20, 1000, 700);
    for (const point of apart) {
      expect(point.x).toBeGreaterThanOrEqual(10);
      expect(point.x).toBeLessThanOrEqual(990);
      for (const other of apart) {
        if (point.key === other.key) continue;
        expect(
          Math.hypot(point.x - other.x, point.y - other.y),
        ).toBeGreaterThanOrEqual(19.9);
      }
    }
  });

  it("gives the same layout whatever order the points arrive in", () => {
    const forward = separatePoints(stacked, 20, 1000, 700);
    const backward = separatePoints([...stacked].reverse(), 20, 1000, 700);
    for (const point of forward) {
      expect(backward.find((item) => item.key === point.key)).toEqual(point);
    }
  });

  it("leaves points alone when no gap is asked for", () => {
    expect(separatePoints(stacked, 0, 1000, 700)).toEqual(stacked);
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
