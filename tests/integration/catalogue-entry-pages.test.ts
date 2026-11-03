import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import { businessCategorySection } from "@/lib/database/schema/business-operations";
import { listEligiblePublicSitemapEntries } from "@/lib/public-sitemap";
import { findCatalogueEntry } from "@/modules/businesses/catalogue-page-model";
import { listCategorySections } from "@/modules/businesses/content-features";
import { saveSectionWithPictures } from "@/modules/businesses/extra-section-pictures";
import {
  derivedEntryId,
  parseExtraSectionForm,
  publicExtraSections,
} from "@/modules/businesses/extra-sections-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const ids = {
  owner: "00000000-0000-4000-8000-000000003701",
  category: "00000000-0000-4000-8000-000000003702",
  live: "00000000-0000-4000-8000-000000003703",
  demo: "00000000-0000-4000-8000-000000003704",
  other: "00000000-0000-4000-8000-000000003705",
} as const;

type Row = { key?: string; title: string; meta?: string };

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

describeDatabase("catalogue entry pages", () => {
  const originalStage = process.env.OURVALLEYS_RELEASE_STAGE;

  beforeEach(async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "public";
    const database = getDatabase();
    await database.insert(user).values({
      id: ids.owner,
      name: "Catalogue Pages Owner",
      email: "catalogue.pages@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: ids.category,
      name: "Catalogue pages",
      slug: "catalogue-pages",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [
        [ids.live, "live", false],
        [ids.demo, "demo", true],
        [ids.other, "other", false],
      ].map(([id, name, isDemo]) => ({
        id: id as string,
        tradingName: `Catalogue Pages ${name}`,
        slug: `catalogue-pages-${name}`,
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

  it("gives every saved entry an id and keeps it through renames and reordering", async () => {
    await save(ids.live, "products", [
      { title: "Candle", meta: "£8.00" },
      { title: "Soap", meta: "£4.50" },
    ]);
    const [first] = await listCategorySections(ids.live);
    const [candle, soap] = first!.entries;
    expect(candle!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(soap!.id).not.toBe(candle!.id);

    // The editor posts each row's id back; the owner renames and swaps rows.
    await save(
      ids.live,
      "products",
      [
        { key: soap!.id!, title: "Soap bar", meta: "£4.50" },
        { key: candle!.id!, title: "Soy candle", meta: "£8.00" },
      ],
      first!.id,
    );
    const [second] = await listCategorySections(ids.live);
    expect(second!.entries.map((e) => [e.id, e.title])).toEqual([
      [soap!.id, "Soap bar"],
      [candle!.id, "Soy candle"],
    ]);
  });

  it("replaces a forged, repeated or malformed row id with a fresh one", async () => {
    await save(ids.live, "products", [
      { key: "not-an-id", title: "One" },
      { key: "11111111-1111-4111-8111-111111111111", title: "Two" },
      { key: "11111111-1111-4111-8111-111111111111", title: "Three" },
    ]);
    const [section] = await listCategorySections(ids.live);
    const entryIds = section!.entries.map((e) => e.id);
    expect(new Set(entryIds).size).toBe(3);
    expect(entryIds).not.toContain("not-an-id");
  });

  it("derives a stable id for entries saved before ids existed", async () => {
    const database = getDatabase();
    const [row] = await database
      .insert(businessCategorySection)
      .values({
        businessId: ids.live,
        sectionType: "treatments",
        title: "Treatments",
        content: {
          entries: [
            { title: "Massage", description: "Relaxing", meta: "£40" },
            { title: "Facial", description: "Glow" },
          ],
        },
        status: "active",
        sortOrder: 0,
      })
      .returning();
    const [one] = await listCategorySections(ids.live);
    const [two] = await listCategorySections(ids.live);
    expect(one!.entries.map((e) => e.id)).toEqual(
      two!.entries.map((e) => e.id),
    );
    expect(one!.entries[0]!.id).toBe(derivedEntryId(row!.id, 0, "Massage"));
    expect(one!.entries[0]!.id).not.toBe(one!.entries[1]!.id);
  });

  it("finds an entry only in a visible section of the same business", async () => {
    await save(ids.live, "products", [{ title: "Candle" }]);
    await save(ids.live, "faq", [{ title: "Do you deliver?" }]);
    await save(ids.other, "products", [{ title: "Other shop item" }]);
    const mine = await listCategorySections(ids.live, true);
    const theirs = await listCategorySections(ids.other, true);
    const candleId = mine.find((s) => s.sectionType === "products")!.entries[0]!
      .id!;
    const faq = mine.find((s) => s.sectionType === "faq")!;

    const found = findCatalogueEntry(publicExtraSections(mine), candleId);
    expect(found?.entry.title).toBe("Candle");
    // Another business's list never resolves this id, and a question is not a page.
    expect(
      findCatalogueEntry(publicExtraSections(theirs), candleId),
    ).toBeNull();
    expect(
      findCatalogueEntry(publicExtraSections(mine), faq.entries[0]!.id ?? "x"),
    ).toBeNull();
  });

  it("does not expose entries of a hidden section", async () => {
    await save(
      ids.live,
      "products",
      [{ title: "Secret" }],
      undefined,
      "hidden",
    );
    const visible = await listCategorySections(ids.live, true);
    expect(visible).toEqual([]);
  });

  it("lists stored entry pages of real published businesses in the sitemap", async () => {
    await save(ids.live, "products", [{ title: "Candle" }]);
    await save(ids.live, "faq", [{ title: "Question" }]);
    await save(ids.demo, "products", [{ title: "Demo item" }]);
    await save(ids.other, "team", [{ title: "Sam" }], undefined, "hidden");
    const [products] = (await listCategorySections(ids.live)).filter(
      (s) => s.sectionType === "products",
    );
    const [demo] = await listCategorySections(ids.demo);

    const paths = (await listEligiblePublicSitemapEntries()).map((e) => e.path);
    expect(paths).toContain(
      `/b/catalogue-pages-live/catalogue/${products!.entries[0]!.id}`,
    );
    expect(paths.some((p) => p.includes(demo!.entries[0]!.id!))).toBe(false);
    expect(
      paths.some((p) => p.startsWith("/b/catalogue-pages-other/catalogue/")),
    ).toBe(false);
    // Questions do not get a page of their own.
    expect(
      paths.filter((p) => p.startsWith("/b/catalogue-pages-live/catalogue/")),
    ).toHaveLength(1);
  });
});
