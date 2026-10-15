import { describe, expect, it } from "vitest";
import {
  businessNameSimilarity,
  foldBusinessName,
  nameMatchKind,
  previewInitials,
  rankSimilarBusinesses,
  startProgress,
  starterPreview,
  type NameMatchCandidate,
} from "./start-journey";

const candidate = (
  overrides: Partial<NameMatchCandidate> & { id: string; tradingName: string },
): NameMatchCandidate => ({
  slug: overrides.id,
  placeName: "Tonypandy",
  categoryName: "Plumbing and heating",
  ...overrides,
});

describe("foldBusinessName", () => {
  it("ignores case, accents, apostrophes and punctuation", () => {
    expect(foldBusinessName("  Tŷ  Gwyn’s – Café! ")).toBe("ty gwyns cafe");
  });
});

describe("businessNameSimilarity", () => {
  it("treats the same name with different case, accents or Ltd as identical", () => {
    expect(
      businessNameSimilarity("Cwm & Coil Heating", "CWM COIL HEATING LTD"),
    ).toBe(1);
    expect(businessNameSimilarity("Café Tŷ Gwyn", "cafe ty gwyn")).toBe(1);
  });

  it("scores a name inside a longer one highly but not as exact", () => {
    const score = businessNameSimilarity("Tiglers", "Tiglers Fish and Chips");
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThan(0.97);
  });

  it("tolerates a typo", () => {
    expect(
      businessNameSimilarity("Cwm Coil Heeting", "Cwm Coil Heating"),
    ).toBeGreaterThan(0.8);
  });

  it("does not match unrelated names or tiny fragments", () => {
    expect(
      businessNameSimilarity("Cwm Coil Heating", "Valley Bakery"),
    ).toBeLessThan(0.4);
    expect(businessNameSimilarity("The", "The Valley Bakery")).toBeLessThan(
      0.62,
    );
    expect(businessNameSimilarity("", "Anything")).toBe(0);
  });
});

describe("nameMatchKind", () => {
  it("grades scores", () => {
    expect(nameMatchKind(1)).toBe("exact");
    expect(nameMatchKind(0.85)).toBe("close");
    expect(nameMatchKind(0.65)).toBe("possible");
  });
});

describe("rankSimilarBusinesses", () => {
  const candidates = [
    candidate({ id: "a", tradingName: "Cwm Coil Heating Services" }),
    candidate({ id: "b", tradingName: "Valley Bakery" }),
    candidate({
      id: "c",
      tradingName: "Cwm Coil Heating",
      placeName: "Maerdy",
    }),
    candidate({
      id: "d",
      tradingName: "Gwres Cwm",
      welshName: "Cwm Coil Heating",
    }),
  ];

  it("drops unrelated businesses and ranks the exact match first", () => {
    const ranked = rankSimilarBusinesses("cwm coil heating", candidates);
    expect(ranked.map((match) => match.id)).not.toContain("b");
    expect(ranked[0]?.matchKind).toBe("exact");
  });

  it("matches on the Welsh trading name", () => {
    const ranked = rankSimilarBusinesses("Cwm Coil Heating", candidates);
    expect(ranked.map((match) => match.id)).toContain("d");
  });

  it("prefers the same place when the names are equally good", () => {
    const tied = [
      candidate({ id: "far", tradingName: "Cwm Coil Heating", placeId: "p2" }),
      candidate({ id: "near", tradingName: "Cwm Coil Heating", placeId: "p1" }),
    ];
    expect(
      rankSimilarBusinesses("Cwm Coil Heating", tied, { placeId: "p1" })[0]?.id,
    ).toBe("near");
  });

  it("de-duplicates and respects the limit", () => {
    const many = Array.from({ length: 9 }, (_, index) =>
      candidate({ id: `x${index % 7}`, tradingName: "Cwm Coil Heating" }),
    );
    const ranked = rankSimilarBusinesses("Cwm Coil Heating", many, {
      limit: 3,
    });
    expect(ranked).toHaveLength(3);
    expect(new Set(ranked.map((match) => match.id)).size).toBe(3);
  });

  it("returns nothing for an empty query", () => {
    expect(rankSimilarBusinesses("  ", candidates)).toEqual([]);
  });
});

describe("startProgress", () => {
  const empty = { name: "", categoryId: "", placeId: "", businessType: "" };

  it("starts with nothing done", () => {
    const progress = startProgress(empty);
    expect(progress.completed).toBe(0);
    expect(progress.ready).toBe(false);
    expect(progress.total).toBe(4);
  });

  it("needs a real name, not one character", () => {
    expect(startProgress({ ...empty, name: "A" }).done.name).toBe(false);
    expect(startProgress({ ...empty, name: " Ab " }).done.name).toBe(true);
  });

  it("is ready when every step is answered with a known reach", () => {
    expect(
      startProgress({
        name: "Cwm Coil",
        categoryId: "c",
        placeId: "p",
        businessType: "service_area",
      }).ready,
    ).toBe(true);
    expect(
      startProgress({
        name: "Cwm Coil",
        categoryId: "c",
        placeId: "p",
        businessType: "carrier-pigeon",
      }).ready,
    ).toBe(false);
  });
});

describe("starterPreview", () => {
  it("leads a trades business with services and the bold template", () => {
    const preview = starterPreview(
      "Plumbing and heating",
      "plumbing-heating",
      "service_area",
    );
    expect(preview.variant).toBe("trades");
    expect(preview.templateKey).toBe("bold");
    expect(preview.sections[0]).toBe("services");
  });

  it("leads a café with its menu on the warm template", () => {
    const preview = starterPreview(
      "Cafés and coffee shops",
      "cafes",
      "premises",
    );
    expect(preview.variant).toBe("hospitality");
    expect(preview.templateKey).toBe("warm");
    expect(preview.sections).toContain("menu");
  });

  it("does not promise a location section to an online business", () => {
    const preview = starterPreview("Gift shops", "gift-shops", "online");
    expect(preview.sections).not.toContain("location");
  });

  it("falls back to the general design and never exceeds six sections", () => {
    const preview = starterPreview("Mystery oddities", "mystery", "premises");
    expect(preview.variant).toBe("general");
    expect(preview.sections.length).toBeLessThanOrEqual(6);
    expect(preview.accent.primary).toMatch(/^#/);
  });
});

describe("previewInitials", () => {
  it("uses the first letters of the first two meaningful words", () => {
    expect(previewInitials("The Cwm Coil Heating")).toBe("CC");
    expect(previewInitials("Éclair")).toBe("É");
  });

  it("falls back to OV for an empty name", () => {
    expect(previewInitials("   ")).toBe("OV");
  });
});
