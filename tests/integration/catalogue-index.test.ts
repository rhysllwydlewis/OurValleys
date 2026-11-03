import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import { listEligiblePublicSitemapEntries } from "@/lib/public-sitemap";
import {
  buildCatalogueIndex,
  parseCatalogueFilters,
} from "@/modules/businesses/catalogue-page-model";
import { listCategorySections } from "@/modules/businesses/content-features";
import { saveSectionWithPictures } from "@/modules/businesses/extra-section-pictures";
import {
  parseExtraSectionForm,
  publicExtraSections,
} from "@/modules/businesses/extra-sections-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const ids = {
  owner: "00000000-0000-4000-8000-000000003801",
  category: "00000000-0000-4000-8000-000000003802",
  live: "00000000-0000-4000-8000-000000003803",
  demo: "00000000-0000-4000-8000-000000003804",
  other: "00000000-0000-4000-8000-000000003805",
} as const;

type Row = { key?: string; title: string; meta?: string; category?: string };

function formOf(type: string, rows: Row[], status = "active") {
  const fields: Record<string, string[]> = {
    entryKey: rows.map((r) => r.key ?? ""),
    entryTitle: rows.map((r) => r.title),
    entryDescription: rows.map(() => "About it"),
    entryMeta: rows.map((r) => r.meta ?? ""),
    entryImageId: rows.map(() => ""),
    entryImageAlt: rows.map(() => ""),
    entryAvailability: rows.map(() => "available"),
    entryUrl: rows.map(() => ""),
    entryCategory: rows.map((r) => r.category ?? ""),
    removeImageRow: [],
  };
  const scalars: Record<string, string> = {
    sectionType: type,
    title: "Shop",
    status,
  };
  return {
    get: (name: string) => scalars[name] ?? fields[name]?.[0] ?? null,
    getAll: (name: string) => fields[name] ?? [],
  };
}

async function save(
  businessId: string,
  type: string,
  rows: Row[],
  sectionId?: string,
  status = "active",
) {
  const parsed = parseExtraSectionForm(formOf(type, rows, status));
  if (!parsed.ok) throw new Error(`refused: ${parsed.problem}`);
  const result = await saveSectionWithPictures({
    businessId,
    sectionId,
    parsed,
    files: rows.map(() => null),
  });
  expect(result.outcome).toBe("saved");
}

describeDatabase("catalogue index and categories", () => {
  const originalStage = process.env.OURVALLEYS_RELEASE_STAGE;

  beforeEach(async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "public";
    const database = getDatabase();
    await database.insert(user).values({
      id: ids.owner,
      name: "Catalogue Index Owner",
      email: "catalogue.index@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: ids.category,
      name: "Catalogue pages",
      slug: "catalogue-index",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [
        [ids.live, "live", false],
        [ids.demo, "demo", true],
        [ids.other, "other", false],
      ].map(([id, name, isDemo]) => ({
        id: id as string,
        tradingName: `Catalogue Index ${name}`,
        slug: `catalogue-index-${name}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: ids.category,
        businessType: "service_area" as const,
        status: "published" as const,
        isDemo: isDemo as boolean,
        createdByUserId: ids.owner,
      })),
    );
  });

  afterEach(async () => {
    if (originalStage === undefined) {
      delete process.env.OURVALLEYS_RELEASE_STAGE;
    } else {
      process.env.OURVALLEYS_RELEASE_STAGE = originalStage;
    }
    const database = getDatabase();
    await database
      .delete(business)
      .where(inArray(business.id, [ids.live, ids.demo, ids.other]));
    await database.delete(category).where(eq(category.id, ids.category));
    await database.delete(user).where(eq(user.id, ids.owner));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("stores a category on products and treatments and reads it back", async () => {
    await save(ids.live, "products", [
      { title: "Loaf", category: "Bakery" },
      { title: "Mug", category: "Gifts" },
      { title: "Plain" },
    ]);
    await save(ids.live, "team", [{ title: "Sam", category: "Ignored" }]);
    const sections = await listCategorySections(ids.live, true);
    const products = sections.find((s) => s.sectionType === "products")!;
    expect(products.entries.map((e) => e.category)).toEqual([
      "Bakery",
      "Gifts",
      undefined,
    ]);
    const team = sections.find((s) => s.sectionType === "team")!;
    expect(team.entries[0]!.category).toBeUndefined();
  });

  it("builds the index only from the business's own visible sections", async () => {
    await save(ids.live, "products", [{ title: "Loaf", category: "Bakery" }]);
    await save(
      ids.live,
      "treatments",
      [{ title: "Massage" }],
      undefined,
      "hidden",
    );
    await save(ids.other, "products", [{ title: "Rival item" }]);
    const mine = publicExtraSections(
      await listCategorySections(ids.live, true),
    );
    const index = buildCatalogueIndex(mine, parseCatalogueFilters({}));
    expect(index.total).toBe(1);
    expect(
      index.sections.flatMap((s) =>
        s.groups.flatMap((g) => g.entries.map((e) => e.title)),
      ),
    ).toEqual(["Loaf"]);
    const search = buildCatalogueIndex(
      mine,
      parseCatalogueFilters({ q: "rival" }),
    );
    expect(search.shown).toBe(0);
  });

  it("lists the catalogue page in the sitemap for real businesses with entries only", async () => {
    await save(ids.live, "products", [{ title: "Loaf" }]);
    await save(ids.demo, "products", [{ title: "Demo loaf" }]);
    const entries = await listEligiblePublicSitemapEntries();
    const paths = entries.map((e) => e.path);
    expect(paths).toContain("/b/catalogue-index-live/catalogue");
    expect(paths).not.toContain("/b/catalogue-index-demo/catalogue");
    expect(paths).not.toContain("/b/catalogue-index-other/catalogue");
  });
});
