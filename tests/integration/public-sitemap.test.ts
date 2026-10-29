import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category, place } from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { user } from "@/lib/database/schema/auth";
import { guide } from "@/lib/database/schema/guides";
import { listEligiblePublicSitemapEntries } from "@/lib/public-sitemap";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const ids = {
  pilot: "00000000-0000-4000-8000-00000000a201",
  seeding: "00000000-0000-4000-8000-00000000a202",
  planned: "00000000-0000-4000-8000-00000000a203",
  retired: "00000000-0000-4000-8000-00000000a204",
} as const;

function fixturePlace(
  id: string,
  slug: string,
  coverageStatus: string,
  status: string,
) {
  return {
    id,
    canonicalName: `Sitemap ${slug}`,
    slug,
    placeType: "town",
    coverageStatus,
    editorialSummary: "Fictional place used only by automated tests.",
    status,
  };
}

describeDatabase("public sitemap place entries", () => {
  const originalStage = process.env.OURVALLEYS_RELEASE_STAGE;

  beforeEach(async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "public";
    await getDatabase()
      .insert(place)
      .values([
        fixturePlace(ids.pilot, "sitemap-pilot", "pilot", "active"),
        fixturePlace(ids.seeding, "sitemap-seeding", "seeding", "active"),
        fixturePlace(ids.planned, "sitemap-planned", "planned", "active"),
        fixturePlace(ids.retired, "sitemap-retired", "pilot", "retired"),
      ]);
  });

  afterEach(async () => {
    if (originalStage === undefined) {
      delete process.env.OURVALLEYS_RELEASE_STAGE;
    } else {
      process.env.OURVALLEYS_RELEASE_STAGE = originalStage;
    }
    await getDatabase()
      .delete(place)
      .where(inArray(place.id, Object.values(ids)));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("lists active places with coverage and omits planned or retired ones", async () => {
    const paths = (await listEligiblePublicSitemapEntries()).map(
      (entry) => entry.path,
    );

    expect(paths).toContain("/places/sitemap-pilot");
    expect(paths).toContain("/places/sitemap-seeding");
    expect(paths).not.toContain("/places/sitemap-planned");
    expect(paths).not.toContain("/places/sitemap-retired");
    expect(paths).not.toContain("/places");
  });

  it("lists published guides and the guides index, omitting drafts and archived", async () => {
    const db = getDatabase();
    const base = {
      summary: "Fictional guide used only by automated tests.",
      areaLabel: "Test valley",
      readingTime: "2 min",
      authorName: "Test author",
    };
    await db.insert(guide).values([
      {
        ...base,
        slug: "sitemap-guide-live",
        title: "Live",
        status: "published",
      },
      { ...base, slug: "sitemap-guide-draft", title: "Draft", status: "draft" },
      { ...base, slug: "sitemap-guide-old", title: "Old", status: "archived" },
    ]);
    try {
      const paths = (await listEligiblePublicSitemapEntries()).map(
        (entry) => entry.path,
      );
      expect(paths).toContain("/guides");
      expect(paths).toContain("/guides/sitemap-guide-live");
      expect(paths).not.toContain("/guides/sitemap-guide-draft");
      expect(paths).not.toContain("/guides/sitemap-guide-old");
    } finally {
      await db
        .delete(guide)
        .where(
          inArray(guide.slug, [
            "sitemap-guide-live",
            "sitemap-guide-draft",
            "sitemap-guide-old",
          ]),
        );
    }
  });

  it("lists live events of real published businesses within 90 days only", async () => {
    const db = getDatabase();
    const uid = (n: string) => `00000000-0000-4000-8000-00000000b${n}`;
    const owner = uid("001");
    const categoryId = uid("002");
    const shops = {
      live: uid("010"),
      demo: uid("011"),
      draft: uid("012"),
      suspended: uid("013"),
    };
    const day = 86_400_000;
    const at = (days: number) => new Date(Date.now() + days * day);
    await db.insert(user).values({
      id: owner,
      name: "Sitemap owner",
      email: "sitemap.events@example.test",
      emailVerified: true,
    });
    await db.insert(category).values({
      id: categoryId,
      name: "Sitemap events",
      slug: "sitemap-events",
      description: "Fictional category used only by automated tests.",
    });
    await db.insert(business).values(
      (
        [
          [shops.live, "live", "published", false, null],
          [shops.demo, "demo", "published", true, null],
          [shops.draft, "draft", "draft", false, null],
          [shops.suspended, "suspended", "published", false, new Date()],
        ] as const
      ).map(([id, slug, status, isDemo, suspendedAt]) => ({
        id,
        tradingName: `Sitemap event ${slug}`,
        slug: `sitemap-event-${slug}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: categoryId,
        businessType: "service_area" as const,
        status,
        isDemo,
        suspendedAt,
        createdByUserId: owner,
      })),
    );
    const base = { description: "Fictional event used only by tests." };
    const events = {
      upcoming: uid("101"),
      running: uid("102"),
      past: uid("103"),
      far: uid("104"),
      draft: uid("105"),
      demo: uid("106"),
      draftShop: uid("107"),
      suspended: uid("108"),
    };
    await db.insert(businessEvent).values([
      {
        ...base,
        id: events.upcoming,
        businessId: shops.live,
        title: "Upcoming",
        status: "active",
        startsAt: at(5),
      },
      {
        ...base,
        id: events.running,
        businessId: shops.live,
        title: "Running",
        status: "active",
        startsAt: at(-1),
        endsAt: at(1),
      },
      {
        ...base,
        id: events.past,
        businessId: shops.live,
        title: "Past",
        status: "active",
        startsAt: at(-5),
        endsAt: at(-4),
      },
      {
        ...base,
        id: events.far,
        businessId: shops.live,
        title: "Far",
        status: "active",
        startsAt: at(200),
      },
      {
        ...base,
        id: events.draft,
        businessId: shops.live,
        title: "Draft",
        status: "draft",
        startsAt: at(5),
      },
      {
        ...base,
        id: events.demo,
        businessId: shops.demo,
        title: "Demo",
        status: "active",
        startsAt: at(5),
      },
      {
        ...base,
        id: events.draftShop,
        businessId: shops.draft,
        title: "Draft shop",
        status: "active",
        startsAt: at(5),
      },
      {
        ...base,
        id: events.suspended,
        businessId: shops.suspended,
        title: "Suspended",
        status: "active",
        startsAt: at(5),
      },
    ]);
    try {
      const paths = (await listEligiblePublicSitemapEntries()).map(
        (entry) => entry.path,
      );
      expect(paths).toContain(`/events/${events.upcoming}`);
      expect(paths).toContain(`/events/${events.running}`);
      for (const excluded of [
        events.past,
        events.far,
        events.draft,
        events.demo,
        events.draftShop,
        events.suspended,
      ]) {
        expect(paths).not.toContain(`/events/${excluded}`);
      }
    } finally {
      await db
        .delete(business)
        .where(inArray(business.id, Object.values(shops)));
      await db.delete(category).where(inArray(category.id, [categoryId]));
      await db.delete(user).where(inArray(user.id, [owner]));
    }
  });

  it("advertises nothing before public release", async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "private_pilot";

    await expect(listEligiblePublicSitemapEntries()).resolves.toEqual([]);
  });
});
