import { describe, expect, it } from "vitest";
import type { BusinessMediaCollection, BusinessMediaItem } from "./media";
import {
  assessAltText,
  clampFocal,
  cropFrames,
  focalFromPointer,
  galleryRoom,
  nudgeFocal,
  objectPositionFor,
  photoCompleteness,
} from "./photo-studio-model";

function item(
  role: BusinessMediaItem["role"],
  altText: string,
  id = `${role}-${altText.length}`,
): BusinessMediaItem {
  return {
    id,
    role,
    url: `https://media.example/${id}.webp`,
    altText,
    focalX: 50,
    focalY: 50,
    sortOrder: 0,
  };
}

describe("focal point helpers", () => {
  it("clamps to whole percentages and falls back to the centre", () => {
    expect(clampFocal(-5)).toBe(0);
    expect(clampFocal(140)).toBe(100);
    expect(clampFocal(33.6)).toBe(34);
    expect(clampFocal(Number.NaN)).toBe(50);
    expect(clampFocal(Number.POSITIVE_INFINITY)).toBe(50);
  });

  it("turns a pointer position into a percentage inside the box", () => {
    const box = { left: 100, top: 50, width: 200, height: 100 };
    expect(focalFromPointer({ ...box, x: 200, y: 100 })).toEqual({
      x: 50,
      y: 50,
    });
    expect(focalFromPointer({ ...box, x: 100, y: 50 })).toEqual({ x: 0, y: 0 });
    // Dragging outside the photo stays pinned to the edge.
    expect(focalFromPointer({ ...box, x: 900, y: -40 })).toEqual({
      x: 100,
      y: 0,
    });
    // A collapsed box (not laid out yet) never produces NaN.
    expect(
      focalFromPointer({ x: 5, y: 5, left: 0, top: 0, width: 0, height: 0 }),
    ).toEqual({ x: 50, y: 50 });
  });

  it("nudges and stays within bounds", () => {
    expect(nudgeFocal({ x: 98, y: 2 }, 5, -5)).toEqual({ x: 100, y: 0 });
    expect(objectPositionFor({ x: 10, y: 90 })).toBe("10% 90%");
    expect(objectPositionFor({ x: 400, y: -4 })).toBe("100% 0%");
  });

  it("describes four crops from wide to square", () => {
    expect(cropFrames.map((frame) => frame.id)).toEqual([
      "wide",
      "tall",
      "card",
      "square",
    ]);
  });
});

describe("assessAltText", () => {
  it("asks for a description when it is missing", () => {
    expect(assessAltText("   ", "gallery")).toMatchObject({
      level: "needs-work",
      hints: ["missing"],
    });
    // A logo may be saved without one, but the studio still nudges.
    expect(assessAltText("", "logo").level).toBe("improve");
  });

  it("refuses what the server would refuse", () => {
    expect(assessAltText("ab", "hero").level).toBe("needs-work");
    expect(assessAltText("ab", "logo").level).not.toBe("needs-work");
  });

  it("accepts a clear sentence", () => {
    expect(
      assessAltText(
        "Our plumber fitting a new boiler in a Cwm kitchen",
        "hero",
      ),
    ).toMatchObject({ level: "good", hints: [] });
  });

  it("flags common description habits", () => {
    expect(
      assessAltText("Photo of a shopfront on the high street", "gallery").hints,
    ).toContain("startsWithImageOf");
    expect(assessAltText("IMG_2041.jpg", "gallery").hints).toContain(
      "looksLikeFilename",
    );
    expect(
      assessAltText("OUR SHOP FRONT IN THE SUN", "gallery").hints,
    ).toContain("allCaps");
    expect(assessAltText("x".repeat(200), "gallery").hints).toContain(
      "tooLong",
    );
    expect(assessAltText("Front door", "gallery").hints).toContain("tooShort");
  });
});

describe("photoCompleteness", () => {
  const empty: BusinessMediaCollection = {
    logo: null,
    hero: null,
    gallery: [],
  };

  it("starts empty with nothing done", () => {
    const result = photoCompleteness(empty);
    expect(result.done).toBe(0);
    expect(result.percent).toBe(0);
    expect(
      result.items.find((entry) => entry.id === "descriptions")?.done,
    ).toBe(false);
  });

  it("counts a complete set", () => {
    const result = photoCompleteness({
      logo: item("logo", "Logo of Cwm Coil Heating"),
      hero: item("hero", "A boiler being serviced in a Cwm home"),
      gallery: [1, 2, 3].map((n) =>
        item("gallery", `A van on a job in the valley number ${n}`, `g${n}`),
      ),
    });
    expect(result).toMatchObject({ done: 4, total: 4, percent: 100 });
  });

  it("does not count an undescribed photo as described", () => {
    const result = photoCompleteness({
      logo: null,
      hero: item("hero", ""),
      gallery: [],
    });
    const descriptions = result.items.find(
      (entry) => entry.id === "descriptions",
    );
    expect(descriptions).toMatchObject({ done: false, have: 0, want: 1 });
    expect(result.items.find((entry) => entry.id === "cover")?.done).toBe(true);
  });

  it("reports the room left in the gallery", () => {
    expect(
      galleryRoom({ ...empty, gallery: [item("gallery", "abc", "a")] }, 12),
    ).toBe(11);
    expect(galleryRoom(empty, 0)).toBe(0);
  });
});
