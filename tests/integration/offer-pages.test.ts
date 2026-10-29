import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  category,
  place,
} from "@/lib/database/schema/business";
import {
  businessOffer,
  offerTranslation,
} from "@/lib/database/schema/business-operations";
import { noticeMute } from "@/lib/database/schema/notice-preference";
import { notification } from "@/lib/database/schema/notification";
import { savedOffer } from "@/lib/database/schema/saved-discovery";
import { listEligiblePublicSitemapEntries } from "@/lib/public-sitemap";
import { buildUserDataExport } from "@/modules/identity/data-export";
import {
  getPublicOffer,
  listRelatedOffers,
} from "@/modules/businesses/public-offer-detail";
import { readPrivacySummary } from "@/modules/residents/privacy-summary";
import { loadSavedItems } from "@/modules/residents/resident-home-data";
import {
  listSavedOfferIdsForUser,
  MAX_SAVED_OFFERS,
  removeOfferForUser,
  saveOfferForUser,
} from "@/modules/residents/saved-discovery";
import { runSavedOfferEndingNotices } from "@/modules/residents/saved-offer-ending";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const id = (suffix: string) =>
  `00000000-0000-4000-8000-0000fa${suffix.padStart(6, "0")}`;
const fixture = {
  ana: id("001"),
  ben: id("002"),
  banned: id("003"),
  unverified: id("004"),
  categoryId: id("010"),
  placeId: id("011"),
  shop: id("020"),
  otherShop: id("021"),
  demoShop: id("022"),
  draftShop: id("023"),
  live: id("101"),
  soon: id("102"),
  openEnded: id("103"),
  justEnded: id("104"),
  longEnded: id("105"),
  draft: id("106"),
  paused: id("107"),
  upcoming: id("108"),
  demoOffer: id("109"),
  draftShopOffer: id("10a"),
  related: id("10b"),
} as const;

const day = 86_400_000;
const now = new Date("2026-10-29T12:00:00.000Z");
const from = (days: number) => new Date(now.getTime() + days * day);

const businessIds = [
  fixture.shop,
  fixture.otherShop,
  fixture.demoShop,
  fixture.draftShop,
];
const userIds = [fixture.ana, fixture.ben, fixture.banned, fixture.unverified];

async function noticesFor(userId: string) {
  return getDatabase()
    .select()
    .from(notification)
    .where(eq(notification.userId, userId));
}

describeDatabase("offer pages and saved offers", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ana,
        name: "Ana",
        email: "offer.ana@example.test",
        emailVerified: true,
      },
      {
        id: fixture.ben,
        name: "Ben",
        email: "offer.ben@example.test",
        emailVerified: true,
      },
      {
        id: fixture.banned,
        name: "Banned",
        email: "offer.banned@example.test",
        emailVerified: true,
        banned: true,
      },
      {
        id: fixture.unverified,
        name: "Unverified",
        email: "offer.unverified@example.test",
        emailVerified: false,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Offer fixtures",
      slug: "offer-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(place).values({
      id: fixture.placeId,
      canonicalName: "Offerville",
      slug: "offerville",
      placeType: "town",
      editorialSummary: "A fictional place for tests.",
    });
    await database.insert(business).values(
      [
        [fixture.shop, "shop", "published", false],
        [fixture.otherShop, "other", "published", false],
        [fixture.demoShop, "demo", "published", true],
        [fixture.draftShop, "draft", "draft", false],
      ].map(([businessId, slug, status, isDemo]) => ({
        id: businessId as string,
        tradingName: `Fixture Offer ${slug}`,
        slug: `fixture-offer-${slug}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area" as const,
        status: status as "published" | "draft",
        isDemo: isDemo as boolean,
        createdByUserId: fixture.ana,
      })),
    );
    await database.insert(businessLocation).values(
      businessIds.map((businessId) => ({
        businessId,
        placeId: fixture.placeId,
        locationType: "service_area",
        isPrimary: true,
      })),
    );
    const base = { description: "Fictional offer used only by tests." };
    await database.insert(businessOffer).values([
      {
        ...base,
        id: fixture.live,
        businessId: fixture.shop,
        title: "Live offer",
        status: "active",
        terms: "One per customer.",
        actionUrl: "https://example.test/deal",
        actionLabel: "Book now",
        endsAt: from(10),
      },
      {
        ...base,
        id: fixture.soon,
        businessId: fixture.shop,
        title: "Ends soon",
        status: "active",
        endsAt: from(1),
      },
      {
        ...base,
        id: fixture.openEnded,
        businessId: fixture.shop,
        title: "Always on",
        status: "active",
      },
      {
        ...base,
        id: fixture.justEnded,
        businessId: fixture.shop,
        title: "Just ended",
        status: "active",
        endsAt: from(-3),
      },
      {
        ...base,
        id: fixture.longEnded,
        businessId: fixture.shop,
        title: "Long ended",
        status: "active",
        endsAt: from(-200),
      },
      {
        ...base,
        id: fixture.draft,
        businessId: fixture.shop,
        title: "Draft offer",
        status: "draft",
      },
      {
        ...base,
        id: fixture.paused,
        businessId: fixture.shop,
        title: "Paused offer",
        status: "hidden",
      },
      {
        ...base,
        id: fixture.upcoming,
        businessId: fixture.shop,
        title: "Upcoming offer",
        status: "active",
        startsAt: from(3),
      },
      {
        ...base,
        id: fixture.demoOffer,
        businessId: fixture.demoShop,
        title: "Demo offer",
        status: "active",
        endsAt: from(1),
      },
      {
        ...base,
        id: fixture.draftShopOffer,
        businessId: fixture.draftShop,
        title: "Draft business offer",
        status: "active",
      },
      {
        ...base,
        id: fixture.related,
        businessId: fixture.otherShop,
        title: "Neighbour offer",
        status: "active",
        endsAt: from(20),
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(notification)
      .where(inArray(notification.userId, userIds));
    await database
      .delete(noticeMute)
      .where(inArray(noticeMute.userId, userIds));
    await database.delete(business).where(inArray(business.id, businessIds));
    await database.delete(place).where(eq(place.id, fixture.placeId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(inArray(user.id, userIds));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("the public page", () => {
    it("reads a live offer with its business, place and terms", async () => {
      const result = await getPublicOffer(fixture.live, "en", now);
      if (result.state !== "found") throw new Error("expected found");
      expect(result.offer).toMatchObject({
        title: "Live offer",
        businessName: "Fixture Offer shop",
        placeName: "Offerville",
        placeSlug: "offerville",
        categorySlug: "offer-fixtures",
        terms: "One per customer.",
        actionUrl: "https://example.test/deal",
        ended: false,
      });
    });

    it("keeps a recently ended offer reachable, marked ended", async () => {
      const result = await getPublicOffer(fixture.justEnded, "en", now);
      if (result.state !== "found") throw new Error("expected found");
      expect(result.offer.ended).toBe(true);
    });

    it("does not show an offer that ended long ago", async () => {
      expect(await getPublicOffer(fixture.longEnded, "en", now)).toEqual({
        state: "not_found",
      });
    });

    it.each([
      ["a draft", fixture.draft],
      ["a paused offer", fixture.paused],
      ["an offer that has not started", fixture.upcoming],
      ["an offer of an unpublished business", fixture.draftShopOffer],
    ])("treats %s as not found", async (_label, offerId) => {
      expect(await getPublicOffer(offerId, "en", now)).toEqual({
        state: "not_found",
      });
    });

    it("treats a malformed or unknown id as not found without querying", async () => {
      expect(await getPublicOffer("not-an-id", "en", now)).toEqual({
        state: "not_found",
      });
      expect(await getPublicOffer(id("fff"), "en", now)).toEqual({
        state: "not_found",
      });
    });

    it("shows the owner's Welsh wording to Welsh readers only", async () => {
      await getDatabase().insert(offerTranslation).values({
        offerId: fixture.live,
        locale: "cy",
        title: "Cynnig byw",
        terms: "Un i bob cwsmer.",
        actionLabel: "Archebu nawr",
      });
      const welsh = await getPublicOffer(fixture.live, "cy", now);
      const english = await getPublicOffer(fixture.live, "en", now);
      if (welsh.state !== "found" || english.state !== "found")
        throw new Error("expected found");
      expect(welsh.offer).toMatchObject({
        title: "Cynnig byw",
        welshTitle: true,
        // The description was not translated, so the English text stays.
        description: "Fictional offer used only by tests.",
        welshDescription: false,
        terms: "Un i bob cwsmer.",
        actionLabel: "Archebu nawr",
      });
      expect(english.offer).toMatchObject({
        title: "Live offer",
        welshTitle: false,
      });
    });

    it("lists related live offers without the offer itself", async () => {
      const result = await getPublicOffer(fixture.live, "en", now);
      if (result.state !== "found") throw new Error("expected found");
      const related = await listRelatedOffers(result.offer, "en");
      const ids = related.map((offer) => offer.id);
      expect(ids).not.toContain(fixture.live);
      expect(ids).toContain(fixture.related);
      for (const hidden of [fixture.draft, fixture.paused, fixture.longEnded]) {
        expect(ids).not.toContain(hidden);
      }
    });

    it("puts live offers of real businesses in the sitemap when the site is public", async () => {
      const previous = process.env.OURVALLEYS_RELEASE_STAGE;
      process.env.OURVALLEYS_RELEASE_STAGE = "public";
      try {
        const paths = (await listEligiblePublicSitemapEntries()).map(
          (entry) => entry.path,
        );
        expect(paths).toContain(`/offers/${fixture.live}`);
        expect(paths).not.toContain(`/offers/${fixture.demoOffer}`);
        expect(paths).not.toContain(`/offers/${fixture.justEnded}`);
        expect(paths).not.toContain(`/offers/${fixture.draft}`);
        expect(paths).not.toContain(`/offers/${fixture.draftShopOffer}`);
      } finally {
        if (previous === undefined) delete process.env.OURVALLEYS_RELEASE_STAGE;
        else process.env.OURVALLEYS_RELEASE_STAGE = previous;
      }
    });
  });

  describe("saving offers", () => {
    it("saves, ignores a repeat and removes", async () => {
      expect(await saveOfferForUser(fixture.ana, fixture.live, now)).toBe(
        "saved",
      );
      expect(await saveOfferForUser(fixture.ana, fixture.live, now)).toBe(
        "already_saved",
      );
      expect(await listSavedOfferIdsForUser(fixture.ana)).toEqual([
        fixture.live,
      ]);
      expect(await removeOfferForUser(fixture.ana, fixture.live)).toBe(
        "removed",
      );
      expect(await removeOfferForUser(fixture.ana, fixture.live)).toBe(
        "not_found",
      );
      expect(await listSavedOfferIdsForUser(fixture.ana)).toEqual([]);
    });

    it.each([
      ["a draft", fixture.draft],
      ["a paused offer", fixture.paused],
      ["an ended offer", fixture.justEnded],
      ["an offer not started", fixture.upcoming],
      ["an offer of an unpublished business", fixture.draftShopOffer],
      ["an offer that does not exist", id("fff")],
    ])(
      "will not save %s and reveals nothing about it",
      async (_label, offerId) => {
        expect(await saveOfferForUser(fixture.ana, offerId, now)).toBe(
          "not_found",
        );
        expect(await listSavedOfferIdsForUser(fixture.ana)).toEqual([]);
      },
    );

    it("rejects malformed ids", async () => {
      expect(await saveOfferForUser("nope", fixture.live)).toBe("invalid");
      expect(await saveOfferForUser(fixture.ana, "nope")).toBe("invalid");
      expect(await removeOfferForUser(fixture.ana, "nope")).toBe("invalid");
    });

    it("keeps each person's list private to them", async () => {
      await saveOfferForUser(fixture.ana, fixture.live, now);
      expect(await listSavedOfferIdsForUser(fixture.ben)).toEqual([]);
      // Ben cannot remove Ana's save.
      expect(await removeOfferForUser(fixture.ben, fixture.live)).toBe(
        "not_found",
      );
      expect(await listSavedOfferIdsForUser(fixture.ana)).toEqual([
        fixture.live,
      ]);
    });

    it("lists saved live offers soonest-ending first, open-ended last, and hides ended ones", async () => {
      await saveOfferForUser(fixture.ana, fixture.openEnded, now);
      await saveOfferForUser(fixture.ana, fixture.live, now);
      await saveOfferForUser(fixture.ana, fixture.soon, now);
      // An offer that ends after being saved drops out of the list but stays saved.
      await getDatabase()
        .update(businessOffer)
        .set({ endsAt: from(-1) })
        .where(eq(businessOffer.id, fixture.live));
      const items = await loadSavedItems(fixture.ana, now, "en");
      if (items.state !== "ready") throw new Error("expected ready");
      expect(items.offers.map((offer) => offer.id)).toEqual([
        fixture.soon,
        fixture.openEnded,
      ]);
      expect(await listSavedOfferIdsForUser(fixture.ana)).toContain(
        fixture.live,
      );
    });

    it("refuses to grow a list past the cap", async () => {
      const database = getDatabase();
      const filler = Array.from({ length: MAX_SAVED_OFFERS }, (_, index) => ({
        id: `00000000-0000-4000-8000-0000fb${String(index).padStart(6, "0")}`,
        businessId: fixture.shop,
        title: `Filler ${index}`,
        description: "Fictional offer used only by tests.",
        status: "active",
      }));
      await database.insert(businessOffer).values(filler);
      await database
        .insert(savedOffer)
        .values(
          filler.map((offer) => ({ userId: fixture.ana, offerId: offer.id })),
        );
      expect(await saveOfferForUser(fixture.ana, fixture.live, now)).toBe(
        "saved",
      );
      expect(await saveOfferForUser(fixture.ana, fixture.soon, now)).toBe(
        "unavailable",
      );
      // A repeat of one already kept is still understood.
      expect(await saveOfferForUser(fixture.ana, fixture.live, now)).toBe(
        "already_saved",
      );
    });

    it("goes when the offer or the person goes", async () => {
      await saveOfferForUser(fixture.ana, fixture.live, now);
      await saveOfferForUser(fixture.ben, fixture.soon, now);
      await getDatabase()
        .delete(businessOffer)
        .where(eq(businessOffer.id, fixture.live));
      await getDatabase().delete(user).where(eq(user.id, fixture.ben));
      const rows = await getDatabase()
        .select()
        .from(savedOffer)
        .where(inArray(savedOffer.userId, [fixture.ana, fixture.ben]));
      expect(rows).toEqual([]);
    });

    it("appears in the personal data export and the privacy counts", async () => {
      await saveOfferForUser(fixture.ana, fixture.live, now);
      const exported = await buildUserDataExport(fixture.ana);
      if (!exported) throw new Error("expected an export");
      expect(exported.savedOffers).toEqual([
        expect.objectContaining({
          offerId: fixture.live,
          title: "Live offer",
          businessName: "Fixture Offer shop",
        }),
      ]);
      const summary = await readPrivacySummary(fixture.ana);
      if (summary.state !== "ready") throw new Error("expected ready");
      expect(summary.holdings.savedOffers).toBe(1);
    });
  });

  describe("ends-soon notices", () => {
    async function save(userId: string, offerId: string) {
      await getDatabase().insert(savedOffer).values({ userId, offerId });
    }

    it("tells a saver once, shortly before the offer ends", async () => {
      await save(fixture.ana, fixture.soon);
      await save(fixture.ana, fixture.live);
      const first = await runSavedOfferEndingNotices(now);
      expect(first.raised).toBe(1);
      const notices = await noticesFor(fixture.ana);
      expect(notices).toHaveLength(1);
      expect(notices[0]).toMatchObject({
        kind: "saved_offer_ending",
        href: `/offers/${fixture.soon}`,
        params: { title: "Ends soon", business: "Fixture Offer shop" },
      });
      // A second run raises nothing more.
      expect((await runSavedOfferEndingNotices(now)).raised).toBe(0);
      expect(await noticesFor(fixture.ana)).toHaveLength(1);
    });

    it("flags the offer again when its end is moved later and nears again", async () => {
      await save(fixture.ana, fixture.soon);
      await runSavedOfferEndingNotices(now);
      await getDatabase()
        .update(businessOffer)
        .set({ endsAt: from(12) })
        .where(eq(businessOffer.id, fixture.soon));
      expect((await runSavedOfferEndingNotices(now)).raised).toBe(0);
      const later = from(11);
      expect((await runSavedOfferEndingNotices(later)).raised).toBe(1);
      expect(await noticesFor(fixture.ana)).toHaveLength(2);
    });

    it("skips people who are banned or unverified, demo businesses and offers no longer live", async () => {
      await save(fixture.banned, fixture.soon);
      await save(fixture.unverified, fixture.soon);
      await save(fixture.ben, fixture.demoOffer);
      await save(fixture.ben, fixture.openEnded);
      await save(fixture.ana, fixture.soon);
      await getDatabase()
        .update(businessOffer)
        .set({ status: "hidden" })
        .where(eq(businessOffer.id, fixture.soon));
      const result = await runSavedOfferEndingNotices(now);
      expect(result.raised).toBe(0);
      for (const userId of userIds)
        expect(await noticesFor(userId)).toEqual([]);
    });

    it("respects a muted kind and does not retry it", async () => {
      await getDatabase()
        .insert(noticeMute)
        .values({ userId: fixture.ana, kind: "saved_offer_ending" });
      await save(fixture.ana, fixture.soon);
      expect((await runSavedOfferEndingNotices(now)).raised).toBe(0);
      expect(await noticesFor(fixture.ana)).toEqual([]);
      const [row] = await getDatabase()
        .select()
        .from(savedOffer)
        .where(eq(savedOffer.userId, fixture.ana));
      expect(row?.endingNoticeAt?.getTime()).toBe(from(1).getTime());
    });
  });
});
