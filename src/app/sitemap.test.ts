import { afterEach, describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalReleaseStage = process.env.OURVALLEYS_RELEASE_STAGE;

  afterEach(() => {
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;

    if (originalReleaseStage === undefined) {
      delete process.env.OURVALLEYS_RELEASE_STAGE;
    } else {
      process.env.OURVALLEYS_RELEASE_STAGE = originalReleaseStage;
    }
  });

  it("advertises no routes before public release", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";
    process.env.OURVALLEYS_RELEASE_STAGE = "private_pilot";

    await expect(sitemap()).resolves.toEqual([]);
  });

  it("builds absolute public and policy URLs at public release", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";
    process.env.OURVALLEYS_RELEASE_STAGE = "public";

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://ourvalleys.example/");
    expect(urls).toContain("https://ourvalleys.example/businesses");
    expect(urls).toContain("https://ourvalleys.example/places");
    expect(urls).toContain("https://ourvalleys.example/categories");
    expect(urls).toContain("https://ourvalleys.example/policies/privacy");
    expect(entries[0]).toMatchObject({
      changeFrequency: "daily",
      priority: 1,
    });
  });

  it("falls back to the local origin without a configured site URL", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.OURVALLEYS_RELEASE_STAGE = "public";

    const entries = await sitemap();

    expect(entries[0]?.url).toBe("http://localhost:3000/");
  });
});
