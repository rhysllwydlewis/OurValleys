import { describe, expect, it } from "vitest";
import { suggestBusinessHref } from "./suggest-business-href";

describe("suggestBusinessHref", () => {
  it("carries the encoded query", () => {
    expect(suggestBusinessHref("Dai's Barbers & Co")).toBe(
      "/suggest-a-business?q=Dai's%20Barbers%20%26%20Co",
    );
  });

  it("truncates to 120 characters", () => {
    const href = suggestBusinessHref("a".repeat(300));
    expect(href).toBe(`/suggest-a-business?q=${"a".repeat(120)}`);
  });

  it("has no query for empty, blank or missing input", () => {
    expect(suggestBusinessHref("")).toBe("/suggest-a-business");
    expect(suggestBusinessHref("   ")).toBe("/suggest-a-business");
    expect(suggestBusinessHref(undefined)).toBe("/suggest-a-business");
    expect(suggestBusinessHref(null)).toBe("/suggest-a-business");
  });
});
