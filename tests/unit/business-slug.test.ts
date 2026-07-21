import { describe, expect, it } from "vitest";
import { slugifyBusinessName } from "@/modules/businesses/slug";

describe("slugifyBusinessName", () => {
  it("builds a clean lowercase hyphenated slug", () => {
    expect(slugifyBusinessName("Tiglers Fish & Chips")).toBe(
      "tiglers-fish-and-chips",
    );
  });

  it("keeps Welsh diacritics readable by transliterating them", () => {
    expect(slugifyBusinessName("Tŷ Coffi Cwtch")).toBe("ty-coffi-cwtch");
    expect(slugifyBusinessName("Siop Fach Ŵyl")).toBe("siop-fach-wyl");
  });

  it("collapses punctuation and surrounding whitespace", () => {
    expect(slugifyBusinessName("  The  (Really)  Good — Bakery!  ")).toBe(
      "the-really-good-bakery",
    );
  });

  it("returns an empty slug when nothing usable remains", () => {
    expect(slugifyBusinessName("!!!")).toBe("");
  });

  it("bounds slug length without trailing hyphens", () => {
    const slug = slugifyBusinessName(
      "A very long fictional business trading name that keeps going well beyond sixty characters",
    );
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});
