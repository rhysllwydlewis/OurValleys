import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  businessPublication,
  businessSite,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessUpdate } from "@/lib/database/schema/business-operations";
import { listEligiblePublicSitemapEntries } from "@/lib/public-sitemap";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const ids = {
  owner: "00000000-0000-4000-8000-000000003901",
  category: "00000000-0000-4000-8000-000000003902",
  place: "00000000-0000-4000-8000-000000003903",
  real: "00000000-0000-4000-8000-000000003904",
  demo: "00000000-0000-4000-8000-000000003905",
  suspended: "00000000-0000-4000-8000-000000003906",
  unpublished: "00000000-0000-4000-8000-000000003907",
  published: "00000000-0000-4000-8000-0000000039a1",
  draft: "00000000-0000-4000-8000-0000000039a2",
  scheduled: "00000000-0000-4000-8000-0000000039a3",
  removed: "00000000-0000-4000-8000-0000000039a4",
  demoUpdate: "00000000-0000-4000-8000-0000000039a5",
  suspendedUpdate: "00000000-0000-4000-8000-0000000039a6",
  unpublishedUpdate: "00000000-0000-4000-8000-0000000039a7",
} as const;

const businessIds = [ids.real, ids.demo, ids.suspended, ids.unpublished];

describeDatabase("update pages in the public sitemap", () => {
  const originalStage = process.env.OURVALLEYS_RELEASE_STAGE;

  beforeEach(async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "public";
    const database = getDatabase();
    await database.insert(user).values({
      id: ids.owner,
      name: "Update Sitemap Owner",
      email: "update.sitemap@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: ids.category,
      name: "Update sitemap",
      slug: "update-sitemap",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(place).values({
      id: ids.place,
      canonicalName: "Update Sitemap Place",
      slug: "update-sitemap-place",
      placeType: "town",
      editorialSummary: "Fictional place used only by automated tests.",
      status: "active",
    });
    await database.insert(business).values(
      [
        [ids.real, "real", false, false],
        [ids.demo, "demo", true, false],
        [ids.suspended, "suspended", false, true],
        [ids.unpublished, "unpublished", false, false],
      ].map(([id, name, isDemo, suspended]) => ({
        id: id as string,
        tradingName: `Update Sitemap ${name}`,
        slug: `update-sitemap-${name}`,
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
    const now = new Date();
    for (const id of businessIds) {
      await database.insert(businessLocation).values({
        businessId: id,
        placeId: ids.place,
        locationType: "premises",
        isPrimary: true,
      });
      if (id === ids.unpublished) continue;
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
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const row = (
      id: string,
      businessId: string,
      status: string,
      publishedAt: Date | null,
    ) => ({
      id,
      businessId,
      title: "Fictional update",
      body: "Fictional update used only by automated tests.",
      status,
      publishedAt,
    });
    await database.insert(businessUpdate).values([
      row(ids.published, ids.real, "published", past),
      row(ids.draft, ids.real, "draft", null),
      {
        ...row(ids.scheduled, ids.real, "scheduled", null),
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      row(ids.removed, ids.real, "removed", past),
      row(ids.demoUpdate, ids.demo, "published", past),
      row(ids.suspendedUpdate, ids.suspended, "published", past),
      row(ids.unpublishedUpdate, ids.unpublished, "published", past),
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
    await database.delete(place).where(eq(place.id, ids.place));
    await database.delete(category).where(eq(category.id, ids.category));
    await database.delete(user).where(eq(user.id, ids.owner));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("lists the updates list and each published update once", async () => {
    const paths = (await listEligiblePublicSitemapEntries()).map((e) => e.path);
    expect(
      paths.filter((path) => path === "/b/update-sitemap-real/updates"),
    ).toHaveLength(1);
    expect(paths).toContain(`/b/update-sitemap-real/updates/${ids.published}`);
  });

  it("leaves out drafts, scheduled and removed updates and ineligible businesses", async () => {
    const paths = (await listEligiblePublicSitemapEntries()).map((e) => e.path);
    for (const id of [ids.draft, ids.scheduled, ids.removed]) {
      expect(paths).not.toContain(`/b/update-sitemap-real/updates/${id}`);
    }
    for (const name of ["demo", "suspended", "unpublished"]) {
      expect(paths).not.toContain(`/b/update-sitemap-${name}/updates`);
    }
    expect(paths.some((p) => p.includes(ids.demoUpdate))).toBe(false);
    expect(paths.some((p) => p.includes(ids.suspendedUpdate))).toBe(false);
    expect(paths.some((p) => p.includes(ids.unpublishedUpdate))).toBe(false);
  });
});
