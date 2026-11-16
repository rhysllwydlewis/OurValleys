import { describe, expect, it } from "vitest";
import {
  GUIDE_PICTURE_ALT_MAX,
  GUIDE_PICTURE_CREDIT_MAX,
  cleanGuidePictureAlt,
  cleanGuidePictureCredit,
  guideCardPicture,
  guidePictureFromColumns,
  guidePictureProblem,
  resolveGuidePicture,
  stockGuidePicture,
} from "./guide-picture-model";

const picture = {
  url: "https://media.example/guides/g/p.webp",
  alt: "A café window on a wet morning",
  altCy: "Ffenestr caffi ar fore gwlyb",
  credit: "A. Photographer",
};

describe("cleaning the words", () => {
  it("single-spaces, trims and bounds the description", () => {
    expect(cleanGuidePictureAlt("  A   café\n window ")).toBe("A café window");
    expect(cleanGuidePictureAlt("x".repeat(500))).toHaveLength(
      GUIDE_PICTURE_ALT_MAX,
    );
  });

  it("treats anything that is not text as empty", () => {
    for (const value of [null, undefined, 7, {}, ["a"]]) {
      expect(cleanGuidePictureAlt(value)).toBe("");
      expect(cleanGuidePictureCredit(value)).toBeNull();
    }
  });

  it("turns a blank credit into null and bounds a long one", () => {
    expect(cleanGuidePictureCredit("   ")).toBeNull();
    expect(cleanGuidePictureCredit(" A.  Photographer ")).toBe(
      "A. Photographer",
    );
    expect(cleanGuidePictureCredit("y".repeat(400))).toHaveLength(
      GUIDE_PICTURE_CREDIT_MAX,
    );
  });

  it("needs a real description before a picture can be saved", () => {
    expect(guidePictureProblem({ alt: " a " })).toBe("alt_missing");
    expect(guidePictureProblem({ alt: null })).toBe("alt_missing");
    expect(guidePictureProblem({ alt: "Hills" })).toBeNull();
  });
});

describe("resolveGuidePicture", () => {
  it("gives Welsh readers the Welsh description where one was written", () => {
    expect(resolveGuidePicture(picture, true)).toMatchObject({
      alt: picture.altCy,
      altLang: "cy",
    });
  });

  it("falls back to English for Welsh readers, marked as English", () => {
    for (const altCy of [null, "", "   "]) {
      expect(resolveGuidePicture({ ...picture, altCy }, true)).toMatchObject({
        alt: picture.alt,
        altLang: "en-GB",
      });
    }
  });

  it("never swaps Welsh in for English readers", () => {
    expect(resolveGuidePicture(picture, false)).toMatchObject({
      alt: picture.alt,
      altLang: "en-GB",
      credit: picture.credit,
    });
  });
});

describe("guidePictureFromColumns", () => {
  const row = {
    imageKey: "guides/g/p.webp",
    imageAlt: "Hills",
    imageAltCy: null,
    imageCredit: null,
  };
  const toUrl = (key: string) => `https://media.example/${key}`;

  it("builds the public view from a complete row", () => {
    expect(guidePictureFromColumns(row, toUrl)).toEqual({
      url: "https://media.example/guides/g/p.webp",
      alt: "Hills",
      altCy: null,
      credit: null,
    });
  });

  it("is no picture without a key, a description or a reachable address", () => {
    expect(
      guidePictureFromColumns({ ...row, imageKey: null }, toUrl),
    ).toBeNull();
    expect(
      guidePictureFromColumns({ ...row, imageAlt: null }, toUrl),
    ).toBeNull();
    expect(guidePictureFromColumns(row, () => null)).toBeNull();
  });
});

describe("card pictures", () => {
  it("uses the guide's own picture when it has one", () => {
    expect(guideCardPicture({ slug: "valley-walks", picture }, 0)).toEqual({
      src: picture.url,
      own: true,
    });
  });

  it("falls back to the stock picture for the guide's subject", () => {
    expect(
      guideCardPicture({ slug: "valley-walks", picture: null }, 2),
    ).toEqual({ src: "/home/guide-trails.webp", own: false });
    expect(guideCardPicture({ slug: "coffee-stops" }, 0).src).toBe(
      "/home/guide-coffee.webp",
    );
  });

  it("spreads stock pictures by position when the subject is unknown", () => {
    const chosen = [0, 1, 2].map((index) =>
      stockGuidePicture("something-else", index),
    );
    expect(new Set(chosen).size).toBe(3);
    expect(stockGuidePicture("", -5)).toMatch(/^\/home\/guide-/);
  });
});
