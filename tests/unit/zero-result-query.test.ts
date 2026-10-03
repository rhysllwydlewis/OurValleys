import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { normaliseZeroResultQuery } =
  await import("@/modules/businesses/analytics");

describe("normaliseZeroResultQuery", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normaliseZeroResultQuery("  Sourdough   Bakery ")).toBe(
      "sourdough bakery",
    );
  });

  it("returns null for empty input", () => {
    expect(normaliseZeroResultQuery("   ")).toBeNull();
    expect(normaliseZeroResultQuery(undefined)).toBeNull();
    expect(normaliseZeroResultQuery(null)).toBeNull();
  });

  it("drops text that looks like an email address", () => {
    expect(normaliseZeroResultQuery("me@example.com")).toBeNull();
  });

  it("drops text that looks like a phone number", () => {
    expect(normaliseZeroResultQuery("01443 123 456")).toBeNull();
    expect(normaliseZeroResultQuery("plumber 24")).toBe("plumber 24");
  });

  it("caps the stored length at 80 characters", () => {
    expect(normaliseZeroResultQuery("a".repeat(200))).toHaveLength(80);
  });
});
