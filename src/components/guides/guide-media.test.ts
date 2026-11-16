import { describe, expect, it } from "vitest";
import { guideCardMedia, guideHeroPicture } from "./guide-media";

const base = "https://media.example";
const picture = {
  url: `${base}/guides/abc/p.webp`,
  alt: "Hills above the town",
  altCy: "Bryniau uwchben y dref",
  credit: "A. Photographer",
};

describe("guideCardMedia", () => {
  it("optimises the guide's own picture when it is on the media host", () => {
    expect(guideCardMedia({ slug: "walks", picture }, 0, base)).toEqual({
      src: picture.url,
      optimised: true,
    });
  });

  it("serves an own picture as stored when the optimiser may not fetch it", () => {
    for (const mediaBase of [undefined, "https://other.example"]) {
      expect(guideCardMedia({ slug: "walks", picture }, 0, mediaBase)).toEqual({
        src: picture.url,
        optimised: false,
      });
    }
    // A key outside the allowed folders is never handed to the optimiser.
    expect(
      guideCardMedia(
        { slug: "walks", picture: { ...picture, url: `${base}/other/p.webp` } },
        0,
        base,
      ).optimised,
    ).toBe(false);
  });

  it("always optimises the local stock picture", () => {
    expect(guideCardMedia({ slug: "valley-walks" }, 1, undefined)).toEqual({
      src: "/home/guide-trails.webp",
      optimised: true,
    });
  });
});

describe("guideHeroPicture", () => {
  it("is null for a guide without its own picture", () => {
    expect(guideHeroPicture(null, false, base)).toBeNull();
    expect(guideHeroPicture(undefined, true, base)).toBeNull();
  });

  it("resolves the description to the reader's language", () => {
    expect(guideHeroPicture(picture, true, base)).toEqual({
      url: picture.url,
      alt: picture.altCy,
      altLang: "cy",
      credit: picture.credit,
      optimised: true,
    });
    expect(guideHeroPicture(picture, false, base)).toMatchObject({
      alt: picture.alt,
      altLang: "en-GB",
    });
  });
});
