import { describe, expect, it } from "vitest";
import { valleysPlaces } from "@/data/reference/valleys-places";
import {
  CONTEXT_LABELS,
  FRAME_ASPECT,
  MAP_FRAME,
  MAX_ZOOM,
  boxesOverlap,
  isInsideFrame,
  nearestOnLine,
  parseSpine,
  placeLabels,
  pointOnLine,
  projectPlaces,
  projectToFrame,
  slantedBox,
  valleysGeography,
  viewAround,
  viewOfPoints,
  widestView,
  zoomView,
  type LabelRequest,
} from "@/lib/valleys-geography";

const full = { x: 0, y: 0, width: MAP_FRAME.width, height: MAP_FRAME.height };

describe("the baked geography", () => {
  it("has a river for every seeded valley", () => {
    const rivers = new Set(valleysGeography.valleys.map((river) => river.slug));
    const valleys = valleysPlaces
      .filter((place) => place.placeType === "valley")
      .map((place) => place.slug);
    expect(valleys.length).toBeGreaterThan(0);
    expect(valleys.filter((slug) => !rivers.has(slug))).toEqual([]);
  });

  it("draws every layer as a path inside a sensible frame", () => {
    const { frame, relief } = valleysGeography;
    expect(frame.width).toBe(1000);
    expect(frame.height).toBeCloseTo(
      (relief.height / relief.width) * frame.width,
      0,
    );
    const paths = [
      valleysGeography.lakes,
      valleysGeography.riversMinor,
      valleysGeography.riversMajor,
      valleysGeography.rail,
      valleysGeography.roadsA,
      valleysGeography.motorway,
      ...valleysGeography.councils.map((council) => council.path),
      ...valleysGeography.valleys.map((river) => river.path),
    ];
    for (const path of paths) {
      expect(path).toMatch(/^M-?[\d.]+ -?[\d.]+l/);
      // Only moves, relative lines and closes: nothing that could carry markup.
      expect(path).toMatch(/^[Mlz\d .-]+$/);
    }
    expect(relief.href).toBe("/map/valleys-relief.webp");
  });

  it("marks exactly the seven covered council areas", () => {
    expect(
      valleysGeography.councils
        .filter((council) => council.covered)
        .map((council) => council.name)
        .sort(),
    ).toEqual([
      "Blaenau Gwent",
      "Bridgend",
      "Caerphilly",
      "Merthyr Tydfil",
      "Neath Port Talbot",
      "Rhondda Cynon Taf",
      "Torfaen",
    ]);
  });

  it("gives each river a spine that runs left to right inside its bounds", () => {
    for (const river of valleysGeography.valleys) {
      const spine = parseSpine(river.spine);
      expect(spine.length).toBeGreaterThan(1);
      expect(spine.at(-1)!.x).toBeGreaterThanOrEqual(spine[0]!.x);
      const [minX, minY, maxX, maxY] = river.bounds as [
        number,
        number,
        number,
        number,
      ];
      expect(minX).toBeLessThan(maxX);
      expect(minY).toBeLessThan(maxY);
    }
  });
});

describe("projectToFrame", () => {
  it("puts every seeded place with a coordinate inside the frame", () => {
    const outside = valleysPlaces.filter(
      (place) =>
        place.latitude !== null &&
        place.longitude !== null &&
        !isInsideFrame({
          latitude: place.latitude,
          longitude: place.longitude,
        }),
    );
    expect(outside.map((place) => place.slug)).toEqual([]);
  });

  it("keeps north up and east to the right", () => {
    const merthyr = projectToFrame({ latitude: 51.748, longitude: -3.378 });
    const pontypridd = projectToFrame({ latitude: 51.602, longitude: -3.342 });
    const neath = projectToFrame({ latitude: 51.656, longitude: -3.805 });
    expect(merthyr.y).toBeLessThan(pontypridd.y);
    expect(neath.x).toBeLessThan(pontypridd.x);
    // 72 metres to a unit: Merthyr is about 16 km north of Pontypridd.
    expect((pontypridd.y - merthyr.y) * 0.072).toBeCloseTo(16.2, 0);
  });

  it("rejects coordinates that are not numbers or are far away", () => {
    expect(isInsideFrame({ latitude: Number.NaN, longitude: -3.3 })).toBe(
      false,
    );
    expect(isInsideFrame({ latitude: 51.5074, longitude: -0.1278 })).toBe(
      false,
    );
  });

  it("rounds fixed label positions so server and browser markup agree", () => {
    for (const label of CONTEXT_LABELS) {
      expect(label.position.x).toBe(Math.round(label.position.x * 10) / 10);
      expect(label.position.y).toBe(Math.round(label.position.y * 10) / 10);
      expect(label.position.x).toBeGreaterThanOrEqual(0);
      expect(label.position.x).toBeLessThanOrEqual(MAP_FRAME.width);
      expect(label.position.y).toBeGreaterThanOrEqual(0);
      expect(label.position.y).toBeLessThanOrEqual(MAP_FRAME.height);
    }
  });
});

describe("projectPlaces", () => {
  it("pulls a place outside the frame to its edge", () => {
    const { points } = projectPlaces([
      { key: "london", latitude: 51.5074, longitude: -0.1278 },
    ]);
    expect(points[0]!.x).toBe(MAP_FRAME.width - 12);
  });

  it("nudges places that share a centroid apart, the same way every time", () => {
    const crowded = ["a", "b", "c"].map((key) => ({
      key,
      latitude: 51.62,
      longitude: -3.45,
    }));
    const first = projectPlaces(crowded, { minGap: 10 }).points;
    const again = projectPlaces([...crowded].reverse(), { minGap: 10 }).points;
    for (const point of first) {
      for (const other of first) {
        if (point.key === other.key) continue;
        expect(
          Math.hypot(point.x - other.x, point.y - other.y),
        ).toBeGreaterThanOrEqual(9.9);
      }
      expect(again.find((item) => item.key === point.key)).toEqual(point);
    }
  });
});

describe("views", () => {
  it("shows the whole frame when the map has the frame's shape", () => {
    expect(widestView(FRAME_ASPECT)).toBe(MAP_FRAME.width);
    expect(viewAround({ x: 10, y: 10 }, 5000)).toEqual(full);
  });

  it("shows only part of the width on a map taller than the frame", () => {
    const view = viewAround({ x: 500, y: 300 }, MAP_FRAME.width, 1.12);
    expect(view.width).toBeCloseTo(MAP_FRAME.height / 1.12, 0);
    expect(view.height).toBeCloseTo(MAP_FRAME.height, 0);
    expect(view.x).toBeGreaterThan(0);
    expect(view.x + view.width).toBeLessThan(MAP_FRAME.width);
  });

  it("never leaves the frame or passes the closest zoom", () => {
    const corner = viewAround({ x: -500, y: 99999 }, 1);
    expect(corner.width).toBeCloseTo(MAP_FRAME.width / MAX_ZOOM, 0);
    expect(corner.x).toBe(0);
    expect(corner.y + corner.height).toBeCloseTo(MAP_FRAME.height, 0);
  });

  it("falls back to something usable for nonsense input", () => {
    const view = viewAround({ x: Number.NaN, y: Number.NaN }, Number.NaN, -1);
    expect(view).toEqual(full);
    expect(zoomView(full, Number.NaN, { x: 1, y: 1 })).toBe(full);
    expect(zoomView(full, 0, { x: 1, y: 1 })).toBe(full);
  });

  it("zooms around the anchor, which stays where it was on screen", () => {
    const anchor = { x: 620, y: 410 };
    const zoomed = zoomView(full, 2, anchor);
    expect(zoomed.width).toBeCloseTo(MAP_FRAME.width / 2, 0);
    expect((anchor.x - zoomed.x) / zoomed.width).toBeCloseTo(
      anchor.x / full.width,
      2,
    );
    expect((anchor.y - zoomed.y) / zoomed.height).toBeCloseTo(
      anchor.y / full.height,
      2,
    );
    expect(zoomView(zoomed, 0.5, anchor)).toEqual(full);
  });

  it("zooms back out to exactly the widest view, whatever the rounding", () => {
    for (const aspect of [FRAME_ASPECT, 1.12, 0.6]) {
      const home = viewAround({ x: 500, y: 360 }, MAP_FRAME.width, aspect);
      const centre = {
        x: home.x + home.width / 2,
        y: home.y + home.height / 2,
      };
      let view = home;
      for (let step = 0; step < 4; step += 1) {
        view = zoomView(view, 1.6, centre, aspect);
      }
      for (let step = 0; step < 4; step += 1) {
        view = zoomView(view, 1 / 1.6, centre, aspect);
      }
      expect(view.width).toBe(home.width);
      expect(view.height).toBe(home.height);
    }
  });

  it("frames a group of points with room around them", () => {
    const points = [
      { x: 400, y: 300 },
      { x: 520, y: 380 },
    ];
    const view = viewOfPoints(points);
    for (const point of points) {
      expect(point.x).toBeGreaterThan(view.x + 20);
      expect(point.x).toBeLessThan(view.x + view.width - 20);
      expect(point.y).toBeGreaterThan(view.y + 20);
      expect(point.y).toBeLessThan(view.y + view.height - 20);
    }
    expect(view.width).toBeLessThan(MAP_FRAME.width);
    // One point is not magnified absurdly, and no points means everything.
    expect(viewOfPoints([{ x: 500, y: 300 }]).width).toBeCloseTo(300, 0);
    expect(viewOfPoints([])).toEqual(full);
    expect(viewOfPoints([{ x: Number.NaN, y: 1 }])).toEqual(full);
  });
});

describe("lines", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it("reads a spine path", () => {
    expect(parseSpine("M1.5 2 3 -4.5")).toEqual([
      { x: 1.5, y: 2 },
      { x: 3, y: -4.5 },
    ]);
    expect(parseSpine("")).toEqual([]);
  });

  it("finds the nearest point on a line and how far along it is", () => {
    const near = nearestOnLine(line, { x: 120, y: 50 });
    expect(near.point).toEqual({ x: 100, y: 50 });
    expect(near.share).toBeCloseTo(0.75, 5);
    expect(near.length).toBe(200);
    expect(nearestOnLine([], { x: 1, y: 2 }).share).toBe(0.5);
  });

  it("finds the point a share of the way along a line", () => {
    expect(pointOnLine(line, 0.25)!.point).toEqual({ x: 50, y: 0 });
    expect(pointOnLine(line, 0.75)!.point).toEqual({ x: 100, y: 50 });
    expect(pointOnLine(line, 7)!.point).toEqual({ x: 100, y: 100 });
    expect(pointOnLine([{ x: 1, y: 1 }], 0.5)).toBeNull();
    expect(
      pointOnLine(
        [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
        ],
        0.5,
      ),
    ).toBeNull();
  });

  it("boxes slanted text", () => {
    const flat = slantedBox({ x: 0, y: 0 }, 100, 10, 0);
    expect(flat).toEqual({ x0: -50, x1: 50, y0: -5, y1: 5 });
    const upright = slantedBox({ x: 0, y: 0 }, 100, 10, Math.PI / 2);
    expect(upright.x1).toBeCloseTo(5, 5);
    expect(upright.y1).toBeCloseTo(50, 5);
    expect(boxesOverlap(flat, upright)).toBe(true);
    expect(boxesOverlap(flat, { x0: 60, x1: 70, y0: -5, y1: 5 })).toBe(false);
  });
});

describe("placeLabels", () => {
  const request = (
    key: string,
    x: number,
    y: number,
    extra: Partial<LabelRequest> = {},
  ): LabelRequest => ({
    key,
    x,
    y,
    radius: 5,
    width: 60,
    height: 14,
    priority: 0,
    forced: false,
    ...extra,
  });

  it("puts a lone name just below its marker", () => {
    const placed = placeLabels([request("a", 500, 300)], full);
    expect(placed.get("a")).toMatchObject({ x: 500, anchor: "middle" });
    expect(placed.get("a")!.y).toBeGreaterThan(305);
  });

  it("moves a name aside rather than overlap a more important one", () => {
    const placed = placeLabels(
      [
        request("town", 500, 300, { priority: 2 }),
        request("village", 540, 300, { priority: 1 }),
      ],
      full,
    );
    expect(placed.get("town")!.anchor).toBe("middle");
    // Below is taken by the town's name, so the village's goes to its right.
    expect(placed.get("village")!.anchor).toBe("start");
  });

  it("keeps a name off another place's marker", () => {
    const placed = placeLabels(
      [request("a", 500, 300, { priority: 2 }), request("b", 500, 316)],
      full,
    );
    expect(placed.get("a")!.anchor).toBe("start");
  });

  it("leaves a name out when nothing is free, unless it is forced", () => {
    const wall = Array.from({ length: 9 }, (_, index) =>
      request(
        `wall-${index}`,
        440 + (index % 3) * 60,
        280 + Math.floor(index / 3) * 20,
        {
          priority: 5,
          width: 58,
        },
      ),
    );
    const squeezed = request("squeezed", 500, 300, { width: 200 });
    expect(placeLabels([...wall, squeezed], full).has("squeezed")).toBe(false);
    expect(
      placeLabels([...wall, { ...squeezed, forced: true }], full).has(
        "squeezed",
      ),
    ).toBe(true);
  });

  it("keeps names inside the view and off reserved space", () => {
    const view = { x: 400, y: 200, width: 200, height: 144 };
    const edge = placeLabels([request("edge", 595, 300)], view);
    expect(edge.get("edge")!.anchor).toBe("end");
    // In a corner with no room at all the name is left out.
    expect(placeLabels([request("corner", 595, 340)], view).size).toBe(0);
    const reserved = placeLabels([request("a", 500, 300)], full, 2, [
      { x0: 460, x1: 540, y0: 305, y1: 325 },
    ]);
    // Below and both sides touch the reserved box, so the name goes above.
    expect(reserved.get("a")!.y).toBeLessThan(295);
  });
});
