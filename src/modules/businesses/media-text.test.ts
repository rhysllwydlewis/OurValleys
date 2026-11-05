import { describe, expect, it } from "vitest";
import {
  captionMaxLength,
  cleanOptionalText,
  resolvePhotoText,
  welshPhotoCoverage,
} from "./media-text";

const full = {
  altText: "  The front counter  ",
  altTextCy: "Y cownter blaen",
  caption: "Fresh every morning",
  captionCy: "Ffres bob bore",
};

describe("cleanOptionalText", () => {
  it("collapses whitespace, trims and turns blank into null", () => {
    expect(cleanOptionalText("  a   b \n c ", 50)).toBe("a b c");
    expect(cleanOptionalText("   ", 50)).toBeNull();
    expect(cleanOptionalText(undefined, 50)).toBeNull();
    expect(cleanOptionalText(null, 50)).toBeNull();
  });

  it("bounds the length", () => {
    expect(cleanOptionalText("x".repeat(500), captionMaxLength)).toHaveLength(
      captionMaxLength,
    );
  });
});

describe("resolvePhotoText", () => {
  it("gives English readers the English words", () => {
    expect(resolvePhotoText(full, "en")).toEqual({
      alt: "The front counter",
      caption: "Fresh every morning",
      altLang: "en-GB",
      captionLang: "en-GB",
    });
  });

  it("gives Welsh readers the Welsh words, marked as Welsh", () => {
    expect(resolvePhotoText(full, "cy")).toEqual({
      alt: "Y cownter blaen",
      caption: "Ffres bob bore",
      altLang: "cy",
      captionLang: "cy",
    });
  });

  it("falls back to English per field and says so", () => {
    expect(
      resolvePhotoText({ ...full, altTextCy: "  ", captionCy: null }, "cy"),
    ).toEqual({
      alt: "The front counter",
      caption: "Fresh every morning",
      altLang: "en-GB",
      captionLang: "en-GB",
    });
    expect(resolvePhotoText({ ...full, altTextCy: null }, "cy")).toMatchObject({
      altLang: "en-GB",
      captionLang: "cy",
    });
  });

  it("never invents a caption", () => {
    expect(
      resolvePhotoText(
        { altText: "x", altTextCy: null, caption: null, captionCy: null },
        "cy",
      ).caption,
    ).toBe("");
  });
});

describe("welshPhotoCoverage", () => {
  it("counts described photos and captions still missing in Welsh", () => {
    expect(
      welshPhotoCoverage([
        { altTextCy: "a", caption: "c", captionCy: null },
        { altTextCy: null, caption: "c", captionCy: "ch" },
        { altTextCy: null, caption: null, captionCy: null },
      ]),
    ).toEqual({ described: 1, total: 3, captionsMissing: 1 });
  });
});
