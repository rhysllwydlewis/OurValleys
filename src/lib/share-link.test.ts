import { describe, expect, it } from "vitest";

import { withWelshLanguage } from "./share-link";

describe("withWelshLanguage", () => {
  it("adds ?lang=cy and keeps the path", () => {
    expect(withWelshLanguage("https://example.test/b/cafe")).toBe(
      "https://example.test/b/cafe?lang=cy",
    );
  });

  it("replaces an existing lang and keeps other parameters", () => {
    expect(withWelshLanguage("https://example.test/e/1?x=2&lang=en")).toBe(
      "https://example.test/e/1?x=2&lang=cy",
    );
  });
});
