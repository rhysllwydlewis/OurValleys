import { describe, expect, it } from "vitest";
import { projectOsgb36, toNationalGrid } from "@/lib/national-grid";

const radians = (degrees: number, minutes = 0, seconds = 0) =>
  ((degrees + minutes / 60 + seconds / 3600) * Math.PI) / 180;

describe("projectOsgb36", () => {
  it("matches the Ordnance Survey worked example to the millimetre", () => {
    // "A guide to coordinate systems in Great Britain", annexe C worked example.
    const grid = projectOsgb36(
      radians(52, 39, 27.2531),
      radians(1, 43, 4.5177),
    );
    expect(grid.easting).toBeCloseTo(651409.903, 2);
    expect(grid.northing).toBeCloseTo(313177.27, 2);
  });

  it("puts the true origin on the false origin offsets", () => {
    const grid = projectOsgb36(radians(49), radians(-2));
    expect(grid.easting).toBeCloseTo(400000, 6);
    expect(grid.northing).toBeCloseTo(-100000, 6);
  });
});

describe("toNationalGrid", () => {
  it("shifts WGS84 to the grid within a few metres", () => {
    // The same point as the worked example, expressed in WGS84.
    const grid = toNationalGrid({
      latitude: 52 + 39 / 60 + 28.72 / 3600,
      longitude: 1 + 42 / 60 + 57.79 / 3600,
    });
    expect(Math.abs(grid.easting - 651409.9)).toBeLessThan(6);
    expect(Math.abs(grid.northing - 313177.3)).toBeLessThan(6);
  });

  it("places Valleys towns in the right kilometre squares", () => {
    // Pontypridd is in ST 07 89/90 and Merthyr Tydfil in SO 05 06.
    const pontypridd = toNationalGrid({ latitude: 51.602, longitude: -3.342 });
    expect(Math.floor(pontypridd.easting / 1000)).toBe(307);
    expect(Math.floor(pontypridd.northing / 1000)).toBeGreaterThanOrEqual(189);
    expect(Math.floor(pontypridd.northing / 1000)).toBeLessThanOrEqual(190);
    const merthyr = toNationalGrid({ latitude: 51.748, longitude: -3.378 });
    expect(Math.floor(merthyr.easting / 1000)).toBe(304);
    expect(Math.floor(merthyr.northing / 1000)).toBe(206);
  });
});
