import { describe, expect, it } from "vitest";
import {
  buildBreadcrumbJsonLd,
  buildMenuJsonLd,
  buildBusinessJsonLd,
  buildEventJsonLd,
  buildOfferJsonLd,
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
  openingExceptions: [],
  attributes: null,
};

describe("buildBusinessJsonLd", () => {
  it("emits one specification per window for a day with a break", () => {
    const ld = buildBusinessJsonLd(
      {
        ...base,
        openingHours: [
          { day: "Wednesday", display: "09:00–12:00, 13:00–17:00" },
        ],
      },
      "https://example.test",
    );
    expect(ld?.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Wednesday",
        opens: "09:00",
        closes: "12:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Wednesday",
        opens: "13:00",
        closes: "17:00",
      },
    ]);
  });

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

  it("emits upcoming special days as dated specifications", () => {
    const ld = buildBusinessJsonLd(
      {
        ...base,
        openingExceptions: [
          {
            date: "2026-12-25",
            label: "Fri 25 Dec",
            display: "Closed",
            note: "Christmas Day",
          },
          {
            date: "2026-12-24",
            label: "Thu 24 Dec",
            display: "09:00–12:00",
            note: null,
          },
        ],
      },
      "https://x.test",
    );
    // Weekly rules stay unrestricted; dated rows live under the special
    // property so consumers treat them as overrides.
    expect(ld?.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Monday",
        opens: "09:00",
        closes: "17:00",
      },
    ]);
    expect(ld?.specialOpeningHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        opens: "00:00",
        closes: "00:00",
        validFrom: "2026-12-25",
        validThrough: "2026-12-25",
      },
      {
        "@type": "OpeningHoursSpecification",
        opens: "09:00",
        closes: "12:00",
        validFrom: "2026-12-24",
        validThrough: "2026-12-24",
      },
    ]);
    expect(JSON.stringify(ld)).not.toContain("Christmas Day");
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
    expect(ld).not.toHaveProperty("specialOpeningHoursSpecification");
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
  it("includes the event picture when there is one and omits it otherwise", () => {
    const withImage = buildEventJsonLd(
      {
        ...baseEvent,
        image: {
          id: "00000000-0000-4000-8000-0000000000aa",
          url: "https://media.x.test/business/b/event/p.webp",
          altText: "Choir on stage",
        },
      },
      "https://x.test",
    );
    expect(withImage?.image).toBe(
      "https://media.x.test/business/b/event/p.webp",
    );
    expect(
      buildEventJsonLd({ ...baseEvent, image: null }, "https://x.test"),
    ).not.toHaveProperty("image");
    expect(buildEventJsonLd(baseEvent, "https://x.test")).not.toHaveProperty(
      "image",
    );
  });

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

describe("buildBreadcrumbJsonLd", () => {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Places", path: "/places" },
    { name: "Pontypridd", path: "/places/pontypridd" },
  ];

  it("emits ordered ListItems with absolute URLs", () => {
    const ld = buildBreadcrumbJsonLd(trail, "https://example.test");
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
    });
    expect(ld?.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://example.test/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Places",
        item: "https://example.test/places",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Pontypridd",
        item: "https://example.test/places/pontypridd",
      },
    ]);
  });

  it("returns null for demo pages and empty trails", () => {
    expect(
      buildBreadcrumbJsonLd(trail, "https://example.test", { demo: true }),
    ).toBeNull();
    expect(buildBreadcrumbJsonLd([], "https://example.test")).toBeNull();
  });
});

describe("buildMenuJsonLd", () => {
  const groups = [
    {
      id: "g1",
      name: "Mains",
      description: null,
      status: "active",
      items: [
        {
          id: "i1",
          name: "Cawl",
          description: "Lamb and leeks",
          priceDisplay: "£12.50",
          dietaryLabels: ["Gluten free", "Locally sourced"],
          available: true,
          featured: false,
        },
        {
          id: "i2",
          name: "Pie",
          description: null,
          priceDisplay: "from £9",
          dietaryLabels: [],
          available: true,
          featured: false,
        },
        {
          id: "i3",
          name: "Sold out",
          description: null,
          priceDisplay: "£1.00",
          dietaryLabels: [],
          available: false,
          featured: false,
        },
      ],
    },
    { id: "g2", name: "Empty", description: null, status: "active", items: [] },
  ];
  const input = {
    businessName: "Café Test",
    path: "/b/cafe-test/menu",
    isDemo: false,
    groups,
  };

  it("maps sections, plain prices and diets and leaves out unavailable dishes", () => {
    const data = buildMenuJsonLd(input, "https://example.test") as {
      hasMenuSection: Array<{ hasMenuItem: Array<Record<string, unknown>> }>;
      url: string;
    };
    expect(data.url).toBe("https://example.test/b/cafe-test/menu");
    expect(data.hasMenuSection).toHaveLength(1);
    const items = data.hasMenuSection[0]!.hasMenuItem;
    expect(items.map((item) => item.name)).toEqual(["Cawl", "Pie"]);
    expect(items[0]).toMatchObject({
      offers: { price: "12.50", priceCurrency: "GBP" },
      suitableForDiet: ["https://schema.org/GlutenFreeDiet"],
    });
    expect(items[1]).not.toHaveProperty("offers");
  });

  it("returns null for demo records and menus with nothing available", () => {
    expect(
      buildMenuJsonLd({ ...input, isDemo: true }, "https://example.test"),
    ).toBeNull();
    expect(
      buildMenuJsonLd(
        { ...input, groups: [groups[1]!] },
        "https://example.test",
      ),
    ).toBeNull();
  });
});

describe("buildOfferJsonLd", () => {
  const offer = {
    id: "00000000-0000-4000-8000-0000000000b1",
    title: "Free quote",
    description: "A free boiler quote.",
    startsAt: new Date("2026-10-01T09:00:00Z"),
    endsAt: new Date("2026-11-01T09:00:00Z"),
    businessName: "Cwm Heating",
    businessSlug: "cwm-heating",
    fictional: false,
    ended: false,
    image: null,
  };

  it("describes a live offer with its seller and validity", () => {
    const data = buildOfferJsonLd(offer, "https://x.test");
    expect(data).toMatchObject({
      "@type": "Offer",
      url: "https://x.test/offers/00000000-0000-4000-8000-0000000000b1",
      name: "Free quote",
      validFrom: "2026-10-01T09:00:00.000Z",
      validThrough: "2026-11-01T09:00:00.000Z",
      seller: { name: "Cwm Heating", url: "https://x.test/b/cwm-heating" },
    });
    expect(data).not.toHaveProperty("image");
  });

  it("leaves out dates that are not set and adds the picture when there is one", () => {
    const data = buildOfferJsonLd(
      {
        ...offer,
        startsAt: null,
        endsAt: null,
        image: { url: "https://media.x.test/o.webp" },
      },
      "https://x.test",
    );
    expect(data).not.toHaveProperty("validFrom");
    expect(data).not.toHaveProperty("validThrough");
    expect(data?.image).toBe("https://media.x.test/o.webp");
  });

  it("emits nothing for a demonstration offer or one that has ended", () => {
    expect(
      buildOfferJsonLd({ ...offer, fictional: true }, "https://x.test"),
    ).toBeNull();
    expect(
      buildOfferJsonLd({ ...offer, ended: true }, "https://x.test"),
    ).toBeNull();
  });
});
