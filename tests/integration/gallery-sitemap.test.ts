import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  businessMedia,
  businessPublication,
  businessSite,
  category,
  place,
} from "@/lib/database/schema/business";
import { listEligiblePublicSitemapEntries } from "@/lib/public-sitemap";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const ids = {
  owner: "00000000-0000-4000-8000-000000003801",
  category: "00000000-0000-4000-8000-000000003802",
  withPhotos: "00000000-0000-4000-8000-000000003803",
  demo: "00000000-0000-4000-8000-000000003804",
  onlyRemoved: "00000000-0000-4000-8000-000000003805",
  onlyHero: "00000000-0000-4000-8000-000000003806",
  suspended: "00000000-0000-4000-8000-000000003807",
  place: "00000000-0000-4000-8000-000000003808",
  inactivePlace: "00000000-0000-4000-8000-000000003809",
  inactivePlaceBusiness: "00000000-0000-4000-8000-00000000380a",
  unpublishedSite: "00000000-0000-4000-8000-00000000380b",
} as const;

const businessIds = [
  ids.withPhotos,
  ids.demo,
  ids.onlyRemoved,
  ids.onlyHero,
  ids.suspended,
  ids.inactivePlaceBusiness,
  ids.unpublishedSite,
];

function media(
  businessId: string,
  key: string,
  role: string,
  status = "active",
) {
  return {
    businessId,
    role,
    status,
    storageKey: `gallery-sitemap-test/${key}.jpg`,
    contentType: "image/jpeg",
    byteSize: 1024,
  };
}

describeDatabase("gallery pages in the public sitemap", () => {
  const originalStage = process.env.OURVALLEYS_RELEASE_STAGE;

  beforeEach(async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "public";
    const database = getDatabase();
    await database.insert(user).values({
      id: ids.owner,
      name: "Gallery Sitemap Owner",
      email: "gallery.sitemap@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: ids.category,
      name: "Gallery sitemap",
      slug: "gallery-sitemap",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [
        [ids.withPhotos, "photos", false, false],
        [ids.demo, "demo", true, false],
        [ids.onlyRemoved, "removed", false, false],
        [ids.onlyHero, "hero", false, false],
        [ids.suspended, "suspended", false, true],
        [ids.inactivePlaceBusiness, "inactive-place", false, false],
        [ids.unpublishedSite, "unpublished", false, false],
      ].map(([id, name, isDemo, suspended]) => ({
        id: id as string,
        tradingName: `Gallery Sitemap ${name}`,
        slug: `gallery-sitemap-${name}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: ids.category,
        businessType: "service_area" as const,
        status: "published" as const,
        isDemo: isDemo as boolean,
        suspendedAt: suspended ? new Date() : null,
        createdByUserId: ids.owner,
      })),
    );
    await database.insert(place).values(
      [
        [ids.place, "active"],
        [ids.inactivePlace, "retired"],
      ].map(([id, status]) => ({
        id: id!,
        canonicalName: `Gallery Sitemap Place ${status}`,
        slug: `gallery-sitemap-place-${status}`,
        placeType: "town",
        editorialSummary: "Fictional place used only by automated tests.",
        status: status!,
      })),
    );
    const now = new Date();
    for (const id of businessIds) {
      await database.insert(businessLocation).values({
        businessId: id,
        placeId:
          id === ids.inactivePlaceBusiness ? ids.inactivePlace : ids.place,
        locationType: "premises",
        isPrimary: true,
      });
      if (id === ids.unpublishedSite) continue;
      const [site] = await database
        .insert(businessSite)
        .values({
          businessId: id,
          templateKey: "universal",
          status: "published",
          platformPath: `/b/${id}`,
          publishedAt: now,
        })
        .returning({ id: businessSite.id });
      await database.insert(businessPublication).values({
        businessId: id,
        businessSiteId: site!.id,
        status: "published",
        publishedAt: now,
      });
    }
    await database
      .insert(businessMedia)
      .values([
        media(ids.withPhotos, "a1", "gallery"),
        media(ids.withPhotos, "a2", "gallery"),
        media(ids.demo, "b1", "gallery"),
        media(ids.onlyRemoved, "c1", "gallery", "removed"),
        media(ids.onlyHero, "d1", "hero"),
        media(ids.suspended, "e1", "gallery"),
        media(ids.inactivePlaceBusiness, "f1", "gallery"),
        media(ids.unpublishedSite, "g1", "gallery"),
      ]);
  });

  afterEach(async () => {
    if (originalStage === undefined) {
      delete process.env.OURVALLEYS_RELEASE_STAGE;
    } else {
      process.env.OURVALLEYS_RELEASE_STAGE = originalStage;
    }
    const database = getDatabase();
    await database.delete(business).where(inArray(business.id, businessIds));
    await database
      .delete(place)
      .where(inArray(place.id, [ids.place, ids.inactivePlace]));
    await database.delete(category).where(eq(category.id, ids.category));
    await database.delete(user).where(eq(user.id, ids.owner));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("lists the gallery page once for a real published business with photos", async () => {
    const paths = (await listEligiblePublicSitemapEntries()).map((e) => e.path);
    expect(
      paths.filter((path) => path === "/b/gallery-sitemap-photos/gallery"),
    ).toHaveLength(1);
  });

  it("leaves out demo, suspended, photo-less, hero-only, inactive-place and unpublished businesses", async () => {
    const paths = (await listEligiblePublicSitemapEntries()).map((e) => e.path);
    for (const name of [
      "demo",
      "removed",
      "hero",
      "suspended",
      "inactive-place",
      "unpublished",
    ]) {
      expect(paths).not.toContain(`/b/gallery-sitemap-${name}/gallery`);
    }
  });
});
