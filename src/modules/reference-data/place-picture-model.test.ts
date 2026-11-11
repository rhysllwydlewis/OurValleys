import { describe, expect, it } from "vitest";
import {
  PLACE_PICTURE_ALT_MAX,
  PLACE_PICTURE_CREDIT_MAX,
  cleanPlacePictureAlt,
  cleanPlacePictureCredit,
  placePictureProblem,
  resolvePlacePicture,
} from "./place-picture-model";

const picture = {
  url: "https://media.test/places/p/1.webp",
  alt: "Terraced houses in the rain",
  altCy: "Tai teras yn y glaw",
  credit: "A. Photographer",
};

describe("place picture text", () => {
  it("collapses whitespace and bounds the description", () => {
    expect(cleanPlacePictureAlt("  a \n  b\t c ")).toBe("a b c");
    expect(cleanPlacePictureAlt("x".repeat(500))).toHaveLength(
      PLACE_PICTURE_ALT_MAX,
    );
    expect(cleanPlacePictureAlt(42)).toBe("");
    expect(cleanPlacePictureAlt(null)).toBe("");
  });

  it("turns a blank credit into null and bounds a long one", () => {
    expect(cleanPlacePictureCredit("   ")).toBeNull();
    expect(cleanPlacePictureCredit(undefined)).toBeNull();
    expect(cleanPlacePictureCredit("y".repeat(300))).toHaveLength(
      PLACE_PICTURE_CREDIT_MAX,
    );
  });

  it("requires a real description before a picture can be saved", () => {
    expect(placePictureProblem({ alt: "" })).toBe("alt_missing");
    expect(placePictureProblem({ alt: "ab" })).toBe("alt_missing");
    expect(placePictureProblem({ alt: "   a   " })).toBe("alt_missing");
    expect(placePictureProblem({ alt: "abc" })).toBeNull();
  });
});

describe("resolvePlacePicture", () => {
  it("gives Welsh readers the Welsh description when one was written", () => {
    const resolved = resolvePlacePicture(picture, true);
    expect(resolved.alt).toBe("Tai teras yn y glaw");
    expect(resolved.altLang).toBe("cy");
  });

  it("falls back to English, marked as English, without Welsh wording", () => {
    for (const altCy of [null, "", "   "]) {
      const resolved = resolvePlacePicture({ ...picture, altCy }, true);
      expect(resolved.alt).toBe(picture.alt);
      expect(resolved.altLang).toBe("en-GB");
    }
  });

  it("never swaps Welsh text in for English readers", () => {
    const resolved = resolvePlacePicture(picture, false);
    expect(resolved.alt).toBe(picture.alt);
    expect(resolved.altLang).toBe("en-GB");
    expect(resolved.credit).toBe("A. Photographer");
  });
});
