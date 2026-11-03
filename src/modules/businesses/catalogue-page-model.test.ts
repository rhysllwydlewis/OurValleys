import { describe, expect, it } from "vitest";
import {
  entryPagePath,
  findCatalogueEntry,
  isEntryId,
  maxSiblingsShown,
  structuredPrice,
} from "./catalogue-page-model";
import type { ExtraSectionShape } from "./extra-sections-model";
import { buildCatalogueEntryJsonLd } from "@/lib/structured-data";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const section = (
  sectionType: ExtraSectionShape["sectionType"],
  count = 3,
): ExtraSectionShape => ({
  id: "s1",
  sectionType,
  title: "List",
  status: "active",
  entries: Array.from({ length: count }, (_, i) => ({
    id: i === 0 ? A : `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, "0")}`,
    title: `Item ${i}`,
    description: "",
  })),
});

describe("findCatalogueEntry", () => {
  it("finds an entry and its siblings, capped", () => {
    const found = findCatalogueEntry(
      [section("products", 20)],
      A.toUpperCase(),
    );
    expect(found?.entry.title).toBe("Item 0");
    expect(found?.siblings).toHaveLength(maxSiblingsShown);
    expect(found?.siblings.some((s) => s.id === A)).toBe(false);
  });
  it("ignores types without pages and unknown ids", () => {
    expect(findCatalogueEntry([section("faq")], A)).toBeNull();
    expect(findCatalogueEntry([section("areas_covered")], A)).toBeNull();
    expect(
      findCatalogueEntry(
        [section("team")],
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      ),
    ).toBeNull();
  });
});

describe("helpers", () => {
  it("validates ids and builds paths", () => {
    expect(isEntryId(A)).toBe(true);
    expect(isEntryId("../etc")).toBe(false);
    expect(entryPagePath("shop", A)).toBe(`/b/shop/catalogue/${A}`);
  });
  it("states only plain pound prices", () => {
    expect(structuredPrice("£12.50")).toBe("12.50");
    expect(structuredPrice("£8")).toBe("8");
    expect(structuredPrice("From £8")).toBeNull();
    expect(structuredPrice("60 min · £45")).toBe("45");
    expect(structuredPrice(undefined)).toBeNull();
  });
});

describe("buildCatalogueEntryJsonLd", () => {
  const base = {
    businessName: "Cwm Shop",
    path: `/b/cwm/catalogue/${A}`,
    isDemo: false,
    name: "Candle",
    description: "Soy",
    price: "8.00",
  };
  it("builds a product with availability, a service and a person", () => {
    const product = buildCatalogueEntryJsonLd(
      { ...base, sectionType: "products", availability: "sold_out" },
      "https://x.test",
    );
    expect(product).toMatchObject({
      "@type": "Product",
      url: `https://x.test/b/cwm/catalogue/${A}`,
      offers: { price: "8.00", availability: "https://schema.org/SoldOut" },
    });
    expect(
      buildCatalogueEntryJsonLd(
        { ...base, sectionType: "treatments" },
        "https://x.test",
      ),
    ).toMatchObject({ "@type": "Service", provider: { name: "Cwm Shop" } });
    expect(
      buildCatalogueEntryJsonLd(
        { ...base, sectionType: "team", price: null, role: "Owner" },
        "https://x.test",
      ),
    ).toMatchObject({ "@type": "Person", jobTitle: "Owner" });
  });
  it("emits no offer without a plain price and nothing for demos", () => {
    const noPrice = buildCatalogueEntryJsonLd(
      { ...base, sectionType: "products", price: null },
      "https://x.test",
    );
    expect(noPrice).not.toHaveProperty("offers");
    expect(
      buildCatalogueEntryJsonLd(
        { ...base, sectionType: "products", isDemo: true },
        "https://x.test",
      ),
    ).toBeNull();
  });
});

describe("localiseCataloguePage", () => {
  const section = {
    id: "s1",
    sectionType: "products" as const,
    title: "Shop",
    status: "active",
    welsh: undefined as boolean | undefined,
    entries: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Candle",
        description: "Soy",
        titleCy: "Cannwyll",
        descriptionCy: "Soi",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Soap",
        description: "",
        titleCy: "Sebon",
      },
    ],
  };

  it("gives Welsh readers the Welsh entry and siblings", async () => {
    const { localiseCataloguePage } = await import("./catalogue-page-model");
    const page = localiseCataloguePage(
      { section, entry: section.entries[0]! },
      "cy",
    );
    expect(page.section.welsh).toBe(true);
    expect(page.entry.title).toBe("Cannwyll");
    expect(page.siblings.map((item) => item.title)).toEqual(["Sebon"]);
  });

  it("leaves English readers and untranslated lists alone", async () => {
    const { localiseCataloguePage } = await import("./catalogue-page-model");
    const english = localiseCataloguePage(
      { section, entry: section.entries[0]! },
      "en",
    );
    expect(english.entry.title).toBe("Candle");
    const half = {
      ...section,
      entries: [
        section.entries[0]!,
        { ...section.entries[1]!, titleCy: undefined },
      ],
    };
    const page = localiseCataloguePage(
      { section: half, entry: half.entries[0]! },
      "cy",
    );
    expect(page.section.welsh).toBeUndefined();
    expect(page.entry.title).toBe("Candle");
  });
});
