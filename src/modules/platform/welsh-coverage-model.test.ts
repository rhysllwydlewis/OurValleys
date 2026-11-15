import { describe, expect, it } from "vitest";
import {
  buildWelshCoverage,
  percentOf,
  type WelshCoverageBusinessInput,
} from "./welsh-coverage-model";

const base: WelshCoverageBusinessInput = {
  id: "a",
  tradingName: "Alpha",
  slug: "alpha",
  welshName: "Alffa",
  welshSummary: "Crynodeb",
  welshDescription: "Disgrifiad",
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  services: 2,
  servicesWithWelsh: 2,
  photos: 1,
  photosWithWelshAlt: 1,
};

describe("buildWelshCoverage", () => {
  it("reports full coverage and no rows when nothing is missing", () => {
    const result = buildWelshCoverage([base]);
    expect(result.rows).toEqual([]);
    expect(result.figures.every((figure) => figure.percent === 100)).toBe(true);
  });

  it("treats blank and whitespace-only Welsh text as missing", () => {
    const result = buildWelshCoverage([
      { ...base, welshName: "  ", welshSummary: null, welshDescription: "" },
    ]);
    expect(result.rows[0]?.gaps).toMatchObject({
      name: true,
      summary: true,
      description: true,
    });
    expect(result.figures[0]).toMatchObject({ covered: 0, total: 1 });
  });

  it("ranks by gap count, then most recently updated", () => {
    const result = buildWelshCoverage([
      { ...base, id: "few", welshName: null },
      {
        ...base,
        id: "many",
        welshName: null,
        welshSummary: null,
        services: 3,
        servicesWithWelsh: 0,
      },
      {
        ...base,
        id: "few-newer",
        welshName: null,
        updatedAt: new Date("2026-06-01T00:00:00Z"),
      },
    ]);
    expect(result.rows.map((row) => row.id)).toEqual([
      "many",
      "few-newer",
      "few",
    ]);
    expect(result.rows[0]?.gapCount).toBe(5);
    expect(result.businessesWithGaps).toBe(3);
  });

  it("counts services and photos across businesses", () => {
    const result = buildWelshCoverage([
      { ...base, services: 4, servicesWithWelsh: 1 },
      { ...base, id: "b", photos: 3, photosWithWelshAlt: 0 },
    ]);
    const services = result.figures.find((f) => f.label === "Services");
    const photos = result.figures.find((f) => f.label === "Photo descriptions");
    expect(services).toMatchObject({ covered: 3, total: 6, percent: 50 });
    expect(photos).toMatchObject({ covered: 1, total: 4, percent: 25 });
  });

  it("handles an empty directory", () => {
    const result = buildWelshCoverage([]);
    expect(result.rows).toEqual([]);
    expect(percentOf(0, 0)).toBe(100);
  });
});
