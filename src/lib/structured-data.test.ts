import { describe, expect, it } from "vitest";
import { buildBusinessJsonLd, serializeJsonLd } from "./structured-data";
import type { PublicBusinessDetail } from "@/modules/businesses/types";

const base: PublicBusinessDetail = {
  id: "b1",
  slug: "caffi-bont",
  tradingName: "Caffi'r Bont",
  welshName: "Caffi'r Bont",
  summary: "Coffee by the bridge.",
  description: "Long description",
  publicPhone: "01443 000000",
  publicEmail: "hello@example.test",
  businessType: "sole_trader",
  category: { name: "Cafe", slug: "cafe" },
  place: { name: "Pontypridd", slug: "pontypridd" },
  verificationStatus: "unverified",
  isDemo: false,
  updatedAt: new Date("2026-09-01T00:00:00Z"),
  rating: { average: 4.5, count: 2 },
  distanceKm: null,
  location: {
    type: "premises",
    display: "1 Secret Street, Pontypridd, CF37 1AA",
    addressVisibility: "area_only",
  },
  site: {
    templateKey: "universal",
    platformPath: "/b/caffi-bont",
    publishedAt: new Date("2026-09-01T00:00:00Z"),
  },
  services: [],
  openingHours: [
    { day: "Monday", display: "09:00–17:00" },
    { day: "Tuesday", display: "Closed" },
  ],
  attributes: null,
};

describe("buildBusinessJsonLd", () => {
  it("maps public fields, hours and rating", () => {
    const ld = buildBusinessJsonLd(base, "https://example.test");
    expect(ld).toMatchObject({
      "@type": "LocalBusiness",
      url: "https://example.test/b/caffi-bont",
      telephone: "01443 000000",
      address: { addressLocality: "Pontypridd", addressCountry: "GB" },
      aggregateRating: { ratingValue: 4.5, reviewCount: 2 },
    });
    expect(ld?.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Monday",
        opens: "09:00",
        closes: "17:00",
      },
    ]);
  });

  it("never emits the street address or private location display", () => {
    const json = JSON.stringify(buildBusinessJsonLd(base, "https://x.test"));
    expect(json).not.toContain("Secret Street");
    expect(json).not.toContain("CF37");
  });

  it("emits nothing for demo businesses", () => {
    expect(
      buildBusinessJsonLd({ ...base, isDemo: true }, "https://x.test"),
    ).toBeNull();
  });

  it("omits rating and hours when absent", () => {
    const ld = buildBusinessJsonLd(
      { ...base, rating: { average: null, count: 0 }, openingHours: [] },
      "https://x.test",
    );
    expect(ld).not.toHaveProperty("aggregateRating");
    expect(ld).not.toHaveProperty("openingHoursSpecification");
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so a script tag cannot be closed", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
