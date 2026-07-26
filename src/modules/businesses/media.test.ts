import { describe, expect, it } from "vitest";
import { isMediaRole, mediaLimits } from "./media";

describe("isMediaRole", () => {
  it("accepts every declared media role", () => {
    for (const role of Object.keys(mediaLimits)) {
      expect(isMediaRole(role)).toBe(true);
    }
  });

  it("rejects values outside the declared roles", () => {
    expect(isMediaRole("banner")).toBe(false);
    expect(isMediaRole("")).toBe(false);
    expect(isMediaRole("Logo")).toBe(false);
  });
});
