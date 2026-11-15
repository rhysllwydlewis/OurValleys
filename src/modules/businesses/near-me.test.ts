import { describe, expect, it } from "vitest";
import { parseDirectoryFilters } from "./directory-filters";
import {
  nearMeHref,
  radiusFor,
  resolveNearMe,
  type PlaceCentroid,
} from "./near-me";

const aberdare: PlaceCentroid = {
  slug: "aberdare",
  name: "Aberdare",
  welshName: "Aberdâr",
  latitude: 51.7131,
  longitude: -3.4437,
};
const tonypandy: PlaceCentroid = {
  slug: "tonypandy",
  name: "Tonypandy",
  welshName: null,
  latitude: 51.6195,
  longitude: -3.4474,
};

describe("resolveNearMe", () => {
  it("picks the closest place and a radius that reaches it", () => {
    const result = resolveNearMe({ latitude: 51.7, longitude: -3.45 }, [
      tonypandy,
      aberdare,
    ]);
    expect(result.status).toBe("found");
    if (result.status !== "found") return;
    expect(result.place.slug).toBe("aberdare");
    expect(result.distanceKm).toBeLessThan(2);
    expect(result.radiusKm).toBe(8);
  });

  it("widens the radius when the nearest place centre is further than 8km", () => {
    const result = resolveNearMe({ latitude: 51.66, longitude: -3.2 }, [
      aberdare,
      tonypandy,
    ]);
    expect(result.status).toBe("found");
    if (result.status !== "found") return;
    expect(result.radiusKm).toBeGreaterThan(8);
    expect(result.radiusKm).toBeGreaterThanOrEqual(result.distanceKm);
  });

  it("breaks an exact tie by slug so the answer is stable", () => {
    const a = { ...aberdare, slug: "a-town" };
    const b = { ...aberdare, slug: "b-town" };
    const result = resolveNearMe({ latitude: 51.7, longitude: -3.4 }, [b, a]);
    expect(result.status === "found" && result.place.slug).toBe("a-town");
  });

  it("says the visitor is outside the area rather than guessing", () => {
    const result = resolveNearMe({ latitude: 55.95, longitude: -3.19 }, [
      aberdare,
      tonypandy,
    ]);
    expect(result.status).toBe("outside");
  });

  it("rejects an impossible position and an empty place list", () => {
    expect(
      resolveNearMe({ latitude: Number.NaN, longitude: 0 }, [aberdare]),
    ).toEqual({ status: "invalid" });
    expect(resolveNearMe({ latitude: 91, longitude: 0 }, [aberdare])).toEqual({
      status: "invalid",
    });
    expect(resolveNearMe({ latitude: 0, longitude: 181 }, [aberdare])).toEqual({
      status: "invalid",
    });
    expect(resolveNearMe({ latitude: 51.7, longitude: -3.4 }, [])).toEqual({
      status: "invalid",
    });
  });

  it("ignores places with unusable coordinates", () => {
    const broken = { ...tonypandy, latitude: Number.NaN };
    const result = resolveNearMe({ latitude: 51.62, longitude: -3.44 }, [
      broken,
      aberdare,
    ]);
    expect(result.status === "found" && result.place.slug).toBe("aberdare");
  });
});

describe("radiusFor", () => {
  it("never goes below the radius the visitor already chose", () => {
    expect(radiusFor(1, 15)).toBe(15);
  });
  it("caps at the largest offered radius", () => {
    expect(radiusFor(55, 8)).toBe(30);
  });
});

describe("nearMeHref", () => {
  it("keeps the visitor's other filters, sets near and resets paging", () => {
    const filters = parseDirectoryFilters({
      q: "coffee",
      category: "cafes",
      openNow: "1",
      page: "3",
      sort: "az",
    });
    const result = resolveNearMe({ latitude: 51.7, longitude: -3.45 }, [
      aberdare,
    ]);
    if (result.status !== "found") throw new Error("expected found");
    const href = nearMeHref(filters, result);
    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/businesses");
    expect(url.searchParams.get("near")).toBe("aberdare");
    expect(url.searchParams.get("q")).toBe("coffee");
    expect(url.searchParams.get("category")).toBe("cafes");
    expect(url.searchParams.get("sort")).toBe("az");
    expect(url.searchParams.has("page")).toBe(false);
  });
});
