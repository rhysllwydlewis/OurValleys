import { describe, expect, it } from "vitest";
import {
  buildBusinessJsonLd,
  buildEventJsonLd,
  serializeJsonLd,
} from "./structured-data";
import type { PublicEvent } from "@/modules/events/public";
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

const baseEvent: PublicEvent = {
  id: "5b0c1c1e-6a2f-4d57-9d61-8b3f0c1f2a10",
  title: "Bridge Street food fair",
  description: "Local traders by the bridge.",
  locationDisplay: "Bridge Street car park",
  startsAt: new Date("2026-11-07T10:00:00Z"),
  endsAt: new Date("2026-11-07T15:00:00Z"),
  bookingUrl: "https://example.test/book",
  businessName: "Caffi'r Bont",
  businessSlug: "caffi-bont",
  fictional: false,
};

describe("buildEventJsonLd", () => {
  it("maps public event fields and the organiser", () => {
    expect(buildEventJsonLd(baseEvent, "https://x.test")).toEqual({
      "@context": "https://schema.org",
      "@type": "Event",
      "@id": `https://x.test/events/${baseEvent.id}`,
      url: `https://x.test/events/${baseEvent.id}`,
      name: "Bridge Street food fair",
      description: "Local traders by the bridge.",
      startDate: "2026-11-07T10:00:00.000Z",
      endDate: "2026-11-07T15:00:00.000Z",
      eventStatus: "https://schema.org/EventScheduled",
      organizer: {
        "@type": "Organization",
        name: "Caffi'r Bont",
        url: "https://x.test/b/caffi-bont",
      },
    });
  });

  it("omits end date when absent", () => {
    const ld = buildEventJsonLd(
      { ...baseEvent, endsAt: null },
      "https://x.test",
    );
    expect(ld).not.toHaveProperty("endDate");
  });

  it("does not assert attendance mode or a physical place", () => {
    const ld = buildEventJsonLd(
      { ...baseEvent, locationDisplay: "Online via Zoom" },
      "https://x.test",
    );
    expect(ld).not.toHaveProperty("eventAttendanceMode");
    expect(ld).not.toHaveProperty("location");
  });

  it("emits nothing for demo events", () => {
    expect(
      buildEventJsonLd({ ...baseEvent, fictional: true }, "https://x.test"),
    ).toBeNull();
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so a script tag cannot be closed", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
