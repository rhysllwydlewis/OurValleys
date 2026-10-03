import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { businessOffer } from "@/lib/database/schema/business-operations";
import { listPublicOffers } from "@/modules/businesses/public-offers";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  businessId: "00000000-0000-4000-8000-000000000401",
  offerId: "00000000-0000-4000-8000-000000001101",
  categorySlug: "plumbing-heating",
  placeSlug: "tonypandy",
} as const;

const day = 86_400_000;
const extraIds = {
  expired: "00000000-0000-4000-8000-00000000f101",
  future: "00000000-0000-4000-8000-00000000f102",
  draft: "00000000-0000-4000-8000-00000000f103",
  hidden: "00000000-0000-4000-8000-00000000f104",
  soon: "00000000-0000-4000-8000-00000000f105",
} as const;

describeDatabase("public offer discovery", () => {
  beforeAll(async () => {
    const now = Date.now();
    const base = {
      businessId: fixture.businessId,
      description: "Integration test offer.",
    };
    await getDatabase()
      .insert(businessOffer)
      .values([
        {
          ...base,
          id: extraIds.expired,
          title: "Expired offer",
          status: "active",
          endsAt: new Date(now - day),
        },
        {
          ...base,
          id: extraIds.future,
          title: "Future offer",
          status: "active",
          startsAt: new Date(now + day),
        },
        { ...base, id: extraIds.draft, title: "Draft offer", status: "draft" },
        {
          ...base,
          id: extraIds.hidden,
          title: "Hidden offer",
          status: "hidden",
        },
        {
          ...base,
          id: extraIds.soon,
          title: "Ends soon offer",
          status: "active",
          endsAt: new Date(now + 2 * day),
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await getDatabase()
      .delete(businessOffer)
      .where(inArray(businessOffer.id, Object.values(extraIds)));
    await closeDatabase();
  });

  it("lists the active fixture offer and the soon-ending offer", async () => {
    const result = await listPublicOffers();

    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    const ids = result.offers.map((offer) => offer.id);
    expect(ids).toContain(fixture.offerId);
    expect(ids).toContain(extraIds.soon);
  });

  it("orders soonest-ending first and open-ended offers last", async () => {
    const result = await listPublicOffers();
    if (result.state !== "ready") throw new Error("expected ready");
    const ids = result.offers.map((offer) => offer.id);
    expect(ids.indexOf(extraIds.soon)).toBeLessThan(
      ids.indexOf(fixture.offerId),
    );
  });

  it("excludes expired, not-yet-started, draft and hidden offers", async () => {
    const result = await listPublicOffers();
    if (result.state !== "ready") throw new Error("expected ready");
    const ids = result.offers.map((offer) => offer.id);
    for (const excluded of [
      extraIds.expired,
      extraIds.future,
      extraIds.draft,
      extraIds.hidden,
    ]) {
      expect(ids).not.toContain(excluded);
    }
  });

  it("excludes offers of unpublished businesses", async () => {
    const database = getDatabase();
    const { business } = await import("@/lib/database/schema/business");
    const [original] = await database
      .select({ status: business.status })
      .from(business)
      .where(eq(business.id, fixture.businessId));
    try {
      await database
        .update(business)
        .set({ status: "suspended" })
        .where(eq(business.id, fixture.businessId));
      const result = await listPublicOffers();
      if (result.state !== "ready") throw new Error("expected ready");
      expect(result.offers.map((offer) => offer.id)).not.toContain(
        fixture.offerId,
      );
    } finally {
      await database
        .update(business)
        .set({ status: original?.status ?? "published" })
        .where(eq(business.id, fixture.businessId));
    }
  });

  it("filters by place, category and search term", async () => {
    const byPlace = await listPublicOffers({ place: fixture.placeSlug });
    const byCategory = await listPublicOffers({
      category: fixture.categorySlug,
    });
    const wrongPlace = await listPublicOffers({ place: "treorchy" });
    const byQuery = await listPublicOffers({ query: "heating check" });
    const noMatch = await listPublicOffers({ query: "no-such-search-term" });

    for (const result of [byPlace, byCategory, byQuery]) {
      if (result.state !== "ready") throw new Error("expected ready");
      expect(result.offers.map((offer) => offer.id)).toContain(fixture.offerId);
    }
    if (wrongPlace.state !== "ready" || noMatch.state !== "ready") {
      throw new Error("expected ready");
    }
    expect(wrongPlace.offers.map((offer) => offer.id)).not.toContain(
      fixture.offerId,
    );
    expect(noMatch.total).toBe(0);
  });
});
