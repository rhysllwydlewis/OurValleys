import { describe, expect, it } from "vitest";

import { pickGuideImage } from "./guide-image";

describe("pickGuideImage", () => {
  it("matches the picture to the guide's subject, whatever its position", () => {
    for (const index of [0, 1, 2]) {
      expect(pickGuideImage("valley-trails-for-a-clear-day", index)).toBe(
        "/home/guide-trails.webp",
      );
      expect(
        pickGuideImage("independent-coffee-across-the-valleys", index),
      ).toBe("/home/guide-coffee.webp");
      expect(pickGuideImage("a-practical-afternoon-in-porth", index)).toBe(
        "/home/guide-place.webp",
      );
    }
  });

  it("gives guides with no recognisable subject different pictures by position", () => {
    const chosen = [0, 1, 2].map((index) =>
      pickGuideImage("something-else-entirely", index),
    );
    expect(new Set(chosen).size).toBe(3);
  });

  it("always returns a picture", () => {
    expect(pickGuideImage("", -4)).toMatch(/^\/home\/guide-/);
    expect(pickGuideImage("UPPER-CASE-WALK", 7)).toBe(
      "/home/guide-trails.webp",
    );
  });
});
