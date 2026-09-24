import { describe, expect, it } from "vitest";
import type { BusinessOnboardingDraft } from "@/modules/businesses/onboarding-draft";
import {
  projectDraftBusinessSite,
  projectDraftBusinessSiteWithPublishedFallback,
  projectPublishedBusinessSite,
} from "@/modules/businesses/site-projection";
import type { PublicBusinessDetail } from "@/modules/businesses/types";

const businessId = "11111111-1111-4111-8111-111111111111";

function completeDraft(): BusinessOnboardingDraft {
  return {
    businessId,
    version: 4,
    profile: {
      tradingName: "Cwm Valley Cycles",
      summary: "Independent cycle repairs and servicing for riders across RCT.",
      publicPhone: "01443 000000",
      publicEmail: "hello@example.com",
    },
    location: {
      placeId: "22222222-2222-4222-8222-222222222222",
      locationType: "premises",
      publicAddressVisibility: "locality_only",
      publicAddressLineOne: null,
      publicLocality: "Pontypridd",
      publicPostcode: null,
      privateAddressLineOne: "1 Fictional Street",
      privatePostcode: "CF37 1AA",
    },
    services: [
      {
        name: "Bike servicing",
        description: "A fictional service description.",
        priceGuidance: "From £45",
      },
    ],
    hours: [
      {
        day: "monday",
        closed: false,
        opensAt: "09:00",
        closesAt: "17:00",
      },
    ],
    exceptionalHours: null,
    updatedAt: new Date("2026-07-21T07:00:00.000Z"),
  };
}

function publishedBusiness(): PublicBusinessDetail {
  return {
    id: businessId,
    slug: "cwm-valley-cycles",
    tradingName: "Cwm Valley Cycles",
    welshName: "Beiciau Cwm",
    summary: "Independent cycle repairs and servicing for riders across RCT.",
    description: "A fictional published business.",
    publicPhone: "01443 000000",
    publicEmail: "hello@example.com",
    businessType: "local_business",
    category: { name: "Cycle shops", slug: "cycle-shops" },
    place: { name: "Pontypridd", slug: "pontypridd" },
    verificationStatus: "unverified",
    isDemo: true,
    updatedAt: new Date("2026-07-21T07:00:00.000Z"),
    rating: { average: null, count: 0 },
    distanceKm: null,
    location: {
      type: "premises",
      display: "Serving Pontypridd and nearby communities",
      addressVisibility: "locality_only",
    },
    site: {
      templateKey: "standard",
      platformPath: "/b/cwm-valley-cycles",
      publishedAt: new Date("2026-07-21T07:00:00.000Z"),
    },
    services: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        name: "Bike servicing",
        description: "A fictional service description.",
        priceDisplay: "From £45",
      },
    ],
    openingHours: [{ day: "Monday", display: "09:00–17:00" }],
    attributes: null,
  };
}

describe("canonical business site projection", () => {
  it("projects a complete draft without leaking private premises fields", () => {
    const projection = projectDraftBusinessSite({
      draft: completeDraft(),
      fallbackTradingName: "Fallback business",
    });

    expect(projection).toMatchObject({
      tradingName: "Cwm Valley Cycles",
      locationDisplay: "Serving Pontypridd and nearby communities",
      isComplete: true,
      missingSections: [],
    });
    expect(JSON.stringify(projection)).not.toContain("Fictional Street");
    expect(JSON.stringify(projection)).not.toContain("CF37 1AA");
    expect(projection.openingHours).toEqual([
      { day: "Monday", display: "09:00–17:00" },
    ]);
  });

  it("describes incomplete draft sections honestly", () => {
    const projection = projectDraftBusinessSite({
      draft: null,
      fallbackTradingName: "Your business",
    });

    expect(projection.tradingName).toBe("Your business");
    expect(projection.isComplete).toBe(false);
    expect(projection.missingSections).toEqual([
      "profile",
      "location",
      "services",
      "hours",
    ]);
  });

  it("maps a published business into the same rendering contract", () => {
    expect(projectPublishedBusinessSite(publishedBusiness())).toMatchObject({
      tradingName: "Cwm Valley Cycles",
      welshName: "Beiciau Cwm",
      locationDisplay: "Serving Pontypridd and nearby communities",
      isComplete: true,
      missingSections: [],
    });
  });

  it("does not surface a Welsh name for a draft preview", () => {
    const projection = projectDraftBusinessSite({
      draft: completeDraft(),
      fallbackTradingName: "Fallback business",
    });

    expect(projection.welshName).toBeNull();
  });
});

describe("draft preview with published fallback", () => {
  it("shows the live published profile when nothing has been drafted yet", () => {
    const projection = projectDraftBusinessSiteWithPublishedFallback({
      draft: null,
      published: publishedBusiness(),
      fallbackTradingName: "Your business",
    });

    expect(projection).toMatchObject({
      tradingName: "Cwm Valley Cycles",
      summary: "Independent cycle repairs and servicing for riders across RCT.",
      locationDisplay: "Serving Pontypridd and nearby communities",
      isComplete: true,
      missingSections: [],
    });
    expect(projection.services).toEqual([
      {
        name: "Bike servicing",
        description: "A fictional service description.",
        priceDisplay: "From £45",
      },
    ]);
    expect(projection.openingHours).toEqual([
      { day: "Monday", display: "09:00–17:00" },
    ]);
  });

  it("still reports every section missing when there is no draft and nothing published", () => {
    const projection = projectDraftBusinessSiteWithPublishedFallback({
      draft: null,
      published: null,
      fallbackTradingName: "Your business",
    });

    expect(projection.tradingName).toBe("Your business");
    expect(projection.isComplete).toBe(false);
    expect(projection.missingSections).toEqual([
      "profile",
      "location",
      "services",
      "hours",
    ]);
  });

  it("prefers drafted sections over the published fallback per section", () => {
    const draft: BusinessOnboardingDraft = {
      ...completeDraft(),
      profile: {
        tradingName: "Cwm Valley Cycles (updated)",
        summary: "A freshly drafted summary awaiting review.",
        publicPhone: "01443 000000",
        publicEmail: "hello@example.com",
      },
      services: [
        {
          name: "E-bike servicing",
          description: "A newly drafted service not yet published.",
          priceGuidance: "From £65",
        },
      ],
      location: null,
      hours: [],
    };

    const projection = projectDraftBusinessSiteWithPublishedFallback({
      draft,
      published: publishedBusiness(),
      fallbackTradingName: "Your business",
    });

    expect(projection.tradingName).toBe("Cwm Valley Cycles (updated)");
    expect(projection.services).toEqual([
      {
        name: "E-bike servicing",
        description: "A newly drafted service not yet published.",
        priceDisplay: "From £65",
      },
    ]);
    expect(projection.locationDisplay).toBe(
      "Serving Pontypridd and nearby communities",
    );
    expect(projection.openingHours).toEqual([
      { day: "Monday", display: "09:00–17:00" },
    ]);
    expect(projection.isComplete).toBe(true);
    expect(projection.missingSections).toEqual([]);
  });
});
