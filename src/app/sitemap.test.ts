import { afterEach, describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it("builds absolute URLs for every advertised public route", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";

    const entries = sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://ourvalleys.example/",
      "https://ourvalleys.example/businesses",
      "https://ourvalleys.example/events",
      "https://ourvalleys.example/b/cwm-coil-heating",
    ]);
  });

  it("gives the homepage the highest priority and daily change frequency", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";

    const [home] = sitemap();

    expect(home).toMatchObject({
      changeFrequency: "daily",
      priority: 1,
    });
  });

  it("gives other public routes a lower priority and weekly change frequency", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";

    const [, ...rest] = sitemap();

    for (const entry of rest) {
      expect(entry).toMatchObject({
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  });

  it("falls back to the local development origin without a configured site URL", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const entries = sitemap();

    expect(entries[0]?.url).toBe("http://localhost:3000/");
  });
});
