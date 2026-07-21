import { describe, expect, it } from "vitest";
import { getAvatarTone, getInitials } from "@/lib/initials";

describe("getInitials", () => {
  it("takes the first letter of each of the first two words", () => {
    expect(getInitials("Rhondda Home Tutoring")).toBe("RH");
  });

  it("uppercases lowercase names", () => {
    expect(getInitials("cwm coil heating")).toBe("CC");
  });

  it("returns a single letter for a one-word name", () => {
    expect(getInitials("Amara")).toBe("A");
  });

  it("returns an empty string for blank input", () => {
    expect(getInitials("   ")).toBe("");
    expect(getInitials("")).toBe("");
  });

  it("strips punctuation before taking the first letter", () => {
    expect(getInitials("(Rhys) O'Brien")).toBe("RO");
  });

  it("ignores a word left empty after stripping punctuation", () => {
    expect(getInitials("Rhys -- O'Brien")).toBe("RO");
  });

  it("respects a custom maxWords limit", () => {
    expect(getInitials("Rhondda Home Tutoring Services", 3)).toBe("RHT");
    expect(getInitials("Rhondda Home Tutoring Services", 1)).toBe("R");
  });

  it("handles non-Latin letters as valid word characters", () => {
    expect(getInitials("Ünïcode Name")).toBe("ÜN");
  });
});

describe("getAvatarTone", () => {
  it("is deterministic for the same seed", () => {
    expect(getAvatarTone("Rhondda Home Tutoring")).toBe(
      getAvatarTone("Rhondda Home Tutoring"),
    );
  });

  it("returns a tone within the curated 1-5 range", () => {
    const seeds = [
      "a",
      "business-id-1",
      "Cwm Coil Heating",
      "",
      "z".repeat(50),
    ];
    for (const seed of seeds) {
      const tone = getAvatarTone(seed);
      expect(tone).toBeGreaterThanOrEqual(1);
      expect(tone).toBeLessThanOrEqual(5);
    }
  });

  it("distinguishes most distinct seeds", () => {
    const tones = new Set(
      ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"].map((seed) =>
        getAvatarTone(seed),
      ),
    );
    expect(tones.size).toBeGreaterThan(1);
  });
});
