import { describe, expect, it } from "vitest";
import {
  getPublicSitemapPaths,
  getSiteUrl,
  protectedIndexingPaths,
} from "./site";

describe("public discovery policy", () => {
  it("normalises the configured site URL to the origin root", () => {
    expect(getSiteUrl("https://example.com/path?q=1#fragment").toString()).toBe(
      "https://example.com/",
    );
  });

  it("falls back to local development without inventing a production domain", () => {
    expect(getSiteUrl(undefined).toString()).toBe("http://localhost:3000/");
  });

  it("advertises only implemented public routes", () => {
    expect(getPublicSitemapPaths()).toEqual([
      "/",
      "/businesses",
      "/b/cwm-coil-heating",
    ]);
  });

  it("keeps protected and internal route families out of indexing", () => {
    expect(protectedIndexingPaths).toEqual([
      "/api/",
      "/dashboard/",
      "/login/",
      "/health/",
    ]);
  });
});
