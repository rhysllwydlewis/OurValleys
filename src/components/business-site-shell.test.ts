import { describe, expect, it } from "vitest";
import { pickActiveSection } from "./business-site-shell";

describe("pickActiveSection", () => {
  it("returns null before the first section reaches the threshold", () => {
    expect(
      pickActiveSection(
        [
          { id: "about", top: 500 },
          { id: "hours", top: 900 },
        ],
        200,
      ),
    ).toBeNull();
  });

  it("picks the last section that has scrolled past the threshold", () => {
    expect(
      pickActiveSection(
        [
          { id: "about", top: -400 },
          { id: "services", top: 120 },
          { id: "hours", top: 700 },
        ],
        200,
      ),
    ).toBe("services");
  });

  it("handles no sections", () => {
    expect(pickActiveSection([], 200)).toBeNull();
  });
});
