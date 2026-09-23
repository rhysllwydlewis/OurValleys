import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  businessMedia,
  businessSite,
} from "@/lib/database/schema/business";
import { businessReview } from "@/lib/database/schema/business-reviews";
import {
  getPublishedBusinessBySlug,
  listCategoriesWithPublishedBusinesses,
  listPublishedBusinesses,
} from "@/modules/businesses/public";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000000101",
  businessId: "00000000-0000-4000-8000-000000000401",
  businessSlug: "cwm-coil-heating",
  locationId: "00000000-0000-4000-8000-000000000701",
  siteId: "00000000-0000-4000-8000-000000000801",
} as const;

describeDatabase("public business discovery", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("uses the same canonical business for ranked directory and generated page", async () => {
    const directory = await listPublishedBusinesses({ query: "heating" });
    const detail = await getPublishedBusinessBySlug(fixture.businessSlug);

    expect(directory.state).toBe("ready");
    expect(detail.state).toBe("ready");

    if (directory.state !== "ready" || detail.state !== "ready") return;

    expect(directory.businesses).toHaveLength(1);
    expect(directory.businesses[0]?.id).toBe(fixture.businessId);
    expect(directory.total).toBe(1);
    expect(directory.page).toBe(1);
    expect(directory.hasNextPage).toBe(false);
    expect(detail.business.id).toBe(fixture.businessId);
    expect(detail.business.services).toHaveLength(3);
  });

  it("finds the business through a Welsh category alias", async () => {
    const directory = await listPublishedBusinesses({ query: "plymwr" });

    expect(directory.state).toBe("ready");
    if (directory.state !== "ready") return;
    expect(directory.businesses.map((record) => record.id)).toContain(
      fixture.businessId,
    );
  });

  it("only returns businesses that are open at the given London time", async () => {
    const wednesdayMorning = new Date(Date.UTC(2026, 0, 14, 10, 0)); // Wed, within Mon-Fri 08:00-17:00
    const sundayMorning = new Date(Date.UTC(2026, 0, 18, 10, 0)); // Sun, fixture is closed all day
    const fridayEvening = new Date(Date.UTC(2026, 0, 16, 16, 30)); // Fri, after the 16:00 close

    const openDuringHours = await listPublishedBusinesses({
      query: "heating",
      openNow: true,
      now: wednesdayMorning,
    });
    const closedOnSunday = await listPublishedBusinesses({
      query: "heating",
      openNow: true,
      now: sundayMorning,
    });
    const closedAfterFridayHours = await listPublishedBusinesses({
      query: "heating",
      openNow: true,
      now: fridayEvening,
    });

    expect(openDuringHours.state).toBe("ready");
    if (openDuringHours.state === "ready") {
      expect(openDuringHours.businesses.map((record) => record.id)).toContain(
        fixture.businessId,
      );
    }

    expect(closedOnSunday.state).toBe("ready");
    if (closedOnSunday.state === "ready") {
      expect(closedOnSunday.total).toBe(0);
    }

    expect(closedAfterFridayHours.state).toBe("ready");
    if (closedAfterFridayHours.state === "ready") {
      expect(closedAfterFridayHours.total).toBe(0);
    }
  });

  it("excludes unverified businesses when verifiedOnly is requested", async () => {
    const directory = await listPublishedBusinesses({
      query: "heating",
      verifiedOnly: true,
    });

    expect(directory.state).toBe("ready");
    if (directory.state !== "ready") return;
    expect(directory.total).toBe(0);
  });

  it("recovers an out-of-range page to the first available page", async () => {
    const directory = await listPublishedBusinesses({
      query: "heating",
      page: 999_999,
      pageSize: 1,
    });

    expect(directory.state).toBe("ready");
    if (directory.state !== "ready") return;
    expect(directory.page).toBe(1);
    expect(directory.total).toBe(1);
    expect(directory.businesses[0]?.id).toBe(fixture.businessId);
  });

  it("includes a business within the given radius of the near-place, with its distance", async () => {
    const directory = await listPublishedBusinesses({
      query: "heating",
      nearPlace: "tonypandy",
      radiusKm: 5,
    });

    expect(directory.state).toBe("ready");
    if (directory.state !== "ready") return;
    expect(directory.businesses.map((record) => record.id)).toContain(
      fixture.businessId,
    );
    const distanceKm = directory.businesses.find(
      (record) => record.id === fixture.businessId,
    )?.distanceKm;
    expect(distanceKm).not.toBeNull();
    expect(distanceKm).toBeLessThan(1);
  });

  it("excludes a business outside the given radius of the near-place", async () => {
    // Pontypridd's locality centroid is roughly 8km from Tonypandy, where the
    // fixture business is located, so a tight 3km radius excludes it.
    const directory = await listPublishedBusinesses({
      query: "heating",
      nearPlace: "pontypridd",
      radiusKm: 3,
    });

    expect(directory.state).toBe("ready");
    if (directory.state !== "ready") return;
    expect(directory.total).toBe(0);
  });

  it("orders results nearest-first when a near-place filter is active", async () => {
    const directory = await listPublishedBusinesses({
      nearPlace: "tonypandy",
      radiusKm: 40,
    });

    expect(directory.state).toBe("ready");
    if (directory.state !== "ready") return;
    const distances = directory.businesses.map((record) => record.distanceKm);
    for (let index = 1; index < distances.length; index += 1) {
      expect(distances[index - 1]).not.toBeNull();
      expect(distances[index]).not.toBeNull();
      expect(distances[index - 1]!).toBeLessThanOrEqual(distances[index]!);
    }
  });

  it("ignores an unknown near-place slug rather than erroring the whole search", async () => {
    const directory = await listPublishedBusinesses({
      query: "heating",
      nearPlace: "not-a-real-place",
      radiusKm: 5,
    });

    expect(directory.state).toBe("ready");
    if (directory.state !== "ready") return;
    expect(directory.businesses.map((record) => record.id)).toContain(
      fixture.businessId,
    );
    expect(directory.businesses[0]?.distanceKm).toBeNull();
  });

  it("keeps private canonical fields out of the public projection", async () => {
    const detail = await getPublishedBusinessBySlug(fixture.businessSlug);
    expect(detail.state).toBe("ready");

    const serialised = JSON.stringify(detail);
    expect(serialised).not.toContain("legalNamePrivate");
    expect(serialised).not.toContain("privateAddressLineOne");
    expect(serialised).not.toContain("Fixture Workshop");
    expect(serialised).not.toContain("CF00 0XX");

    const database = getDatabase();
    const [canonicalBusiness] = await database
      .select({ legalNamePrivate: business.legalNamePrivate })
      .from(business)
      .where(eq(business.id, fixture.businessId));
    const [canonicalLocation] = await database
      .select({
        privateAddressLineOne: businessLocation.privateAddressLineOne,
        privatePostcode: businessLocation.privatePostcode,
      })
      .from(businessLocation)
      .where(eq(businessLocation.id, fixture.locationId));

    expect(canonicalBusiness?.legalNamePrivate).toContain("Fictional");
    expect(canonicalLocation?.privateAddressLineOne).toContain("Fixture");
    expect(canonicalLocation?.privatePostcode).toBe("CF00 0XX");
  });

  it("keeps directory and generated-page publication in sync", async () => {
    const database = getDatabase();
    await database
      .update(businessSite)
      .set({ status: "draft" })
      .where(eq(businessSite.id, fixture.siteId));

    try {
      const directory = await listPublishedBusinesses();
      const detail = await getPublishedBusinessBySlug(fixture.businessSlug);

      expect(directory.state).toBe("ready");
      if (directory.state === "ready") {
        expect(directory.businesses).toEqual([]);
        expect(directory.total).toBe(0);
      }
      expect(detail).toEqual({ state: "missing", business: null });
    } finally {
      await database
        .update(businessSite)
        .set({ status: "published" })
        .where(eq(businessSite.id, fixture.siteId));
    }
  });

  it("has no rating on the directory listing and detail page before any review exists", async () => {
    const directory = await listPublishedBusinesses({ query: "heating" });
    const detail = await getPublishedBusinessBySlug(fixture.businessSlug);

    expect(directory.state).toBe("ready");
    expect(detail.state).toBe("ready");
    if (directory.state !== "ready" || detail.state !== "ready") return;

    expect(directory.businesses[0]?.rating).toEqual({
      average: null,
      count: 0,
    });
    expect(detail.business.rating).toEqual({ average: null, count: 0 });
  });

  it("surfaces the average published rating on the directory listing and detail page", async () => {
    const database = getDatabase();
    await database.insert(businessReview).values([
      {
        businessId: fixture.businessId,
        userId: fixture.ownerId,
        rating: 4,
        status: "published",
      },
      {
        businessId: fixture.businessId,
        userId: "00000000-0000-4000-8000-000000000102",
        rating: 2,
        status: "hidden",
      },
    ]);

    try {
      const directory = await listPublishedBusinesses({ query: "heating" });
      const detail = await getPublishedBusinessBySlug(fixture.businessSlug);

      expect(directory.state).toBe("ready");
      expect(detail.state).toBe("ready");
      if (directory.state !== "ready" || detail.state !== "ready") return;

      expect(directory.businesses[0]?.rating).toEqual({
        average: 4,
        count: 1,
      });
      expect(detail.business.rating).toEqual({ average: 4, count: 1 });
    } finally {
      await database
        .delete(businessReview)
        .where(eq(businessReview.businessId, fixture.businessId));
    }
  });

  it("has no card image on the directory listing when no media has been uploaded", async () => {
    const directory = await listPublishedBusinesses({ query: "heating" });

    expect(directory.state).toBe("ready");
    if (directory.state !== "ready") return;
    expect(directory.businesses[0]?.cardImage).toBeNull();
  });

  it("surfaces the active hero photo as the directory card image, in preference to the logo", async () => {
    const database = getDatabase();
    await database.insert(businessMedia).values([
      {
        businessId: fixture.businessId,
        role: "logo",
        storageKey: "test/business-discovery/logo.jpg",
        contentType: "image/jpeg",
        byteSize: 1024,
        focalX: 10,
        focalY: 20,
        status: "active",
      },
      {
        businessId: fixture.businessId,
        role: "hero",
        storageKey: "test/business-discovery/hero.jpg",
        contentType: "image/jpeg",
        byteSize: 2048,
        focalX: 30,
        focalY: 70,
        status: "active",
      },
    ]);

    try {
      const directory = await listPublishedBusinesses({ query: "heating" });

      expect(directory.state).toBe("ready");
      if (directory.state !== "ready") return;
      expect(directory.businesses[0]?.cardImage).toEqual({
        url: expect.stringContaining("test/business-discovery/hero.jpg"),
        focalX: 30,
        focalY: 70,
      });
    } finally {
      await database
        .delete(businessMedia)
        .where(eq(businessMedia.businessId, fixture.businessId));
    }
  });

  it("lists categories that currently have a published business, for zero-result suggestions", async () => {
    const allCategories = await listCategoriesWithPublishedBusinesses();
    expect(
      allCategories.find((option) => option.slug === "plumbing-heating"),
    ).toEqual({
      slug: "plumbing-heating",
      name: expect.any(String),
      welshLabel: expect.anything(),
      count: 1,
    });

    const inFixturePlace = await listCategoriesWithPublishedBusinesses({
      placeSlug: "tonypandy",
    });
    expect(
      inFixturePlace.some((option) => option.slug === "plumbing-heating"),
    ).toBe(true);

    const inEmptyPlace = await listCategoriesWithPublishedBusinesses({
      placeSlug: "aberdare",
    });
    expect(inEmptyPlace).toEqual([]);
  });

  it("allows the active owner and denies cross-tenant access", async () => {
    await expect(
      canUserAccessBusiness({
        userId: fixture.ownerId,
        businessId: fixture.businessId,
        permission: businessPermissions.publish,
      }),
    ).resolves.toBe(true);

    await expect(
      canUserAccessBusiness({
        userId: "00000000-0000-4000-8000-000000000999",
        businessId: fixture.businessId,
        permission: businessPermissions.view,
      }),
    ).resolves.toBe(false);

    await expect(
      canUserAccessBusiness({
        userId: fixture.ownerId,
        businessId: "00000000-0000-4000-8000-000000000998",
        permission: businessPermissions.view,
      }),
    ).resolves.toBe(false);
  });
});
