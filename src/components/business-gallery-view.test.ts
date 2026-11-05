import { describe, expect, it } from "vitest";
import { galleryViews } from "./business-gallery-view";

const t = ((key: string, values?: Record<string, string | number>) =>
  key === "site.gallery.fallbackLabel"
    ? `Photo ${values?.position} of ${values?.total}`
    : key) as Parameters<typeof galleryViews>[2];

const photo = {
  id: "p1",
  url: "https://media.example.test/p1.webp",
  altText: "The counter",
  altTextCy: "Y cownter",
  caption: "Open daily",
  captionCy: "Ar agor bob dydd",
  focalX: 50,
  focalY: 50,
};

describe("galleryViews", () => {
  it("uses the English words for English readers", () => {
    expect(galleryViews([photo], 1, t, "en")[0]).toMatchObject({
      label: "The counter",
      labelLang: "en-GB",
      caption: "Open daily",
      captionLang: "en-GB",
    });
  });

  it("uses the Welsh words for Welsh readers and marks them Welsh", () => {
    expect(galleryViews([photo], 1, t, "cy")[0]).toMatchObject({
      label: "Y cownter",
      labelLang: "cy",
      caption: "Ar agor bob dydd",
      captionLang: "cy",
    });
  });

  it("names an undescribed photo by position without claiming a language", () => {
    const view = galleryViews(
      [{ ...photo, altText: " ", altTextCy: null }],
      4,
      t,
      "cy",
    )[0];
    expect(view).toMatchObject({ label: "Photo 1 of 4" });
    expect(view?.labelLang).toBeUndefined();
  });

  it("tolerates photos with no Welsh or caption fields at all", () => {
    const { altTextCy, caption, captionCy, ...legacy } = photo;
    void altTextCy;
    void caption;
    void captionCy;
    expect(galleryViews([legacy], 1, t, "cy")[0]).toMatchObject({
      label: "The counter",
      caption: "",
    });
  });
});
