import { describe, expect, it } from "vitest";
import { haversineDistanceKm } from "./geo";

describe("haversineDistanceKm", () => {
  it("returns zero for identical coordinates", () => {
    const point = { latitude: 51.622, longitude: -3.455 };
    expect(haversineDistanceKm(point, point)).toBe(0);
  });

  it("matches a known real-world distance within a small tolerance", () => {
    // Tonypandy to Pontypridd, RCT locality centroids from the seeded
    // reference data — roughly 8km apart.
    const tonypandy = { latitude: 51.622, longitude: -3.455 };
    const pontypridd = { latitude: 51.602, longitude: -3.342 };

    const distance = haversineDistanceKm(tonypandy, pontypridd);

    expect(distance).toBeGreaterThan(7);
    expect(distance).toBeLessThan(9);
  });

  it("is symmetric", () => {
    const a = { latitude: 51.659, longitude: -3.505 };
    const b = { latitude: 51.713, longitude: -3.445 };

    expect(haversineDistanceKm(a, b)).toBeCloseTo(
      haversineDistanceKm(b, a),
      10,
    );
  });

  it("never exceeds 1 for the internal clamped chord ratio, so antipodal-ish inputs do not throw", () => {
    const north = { latitude: 89.9, longitude: 0 };
    const south = { latitude: -89.9, longitude: 180 };

    expect(() => haversineDistanceKm(north, south)).not.toThrow();
    expect(Number.isFinite(haversineDistanceKm(north, south))).toBe(true);
  });
});
