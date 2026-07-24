import { afterEach, describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it("allows crawling by default while disallowing every protected route family", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";

    const result = robots();

    expect(result.rules).toMatchObject({
      userAgent: "*",
      allow: "/",
    });
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.disallow).toEqual([
      "/api/",
      "/dashboard/",
      "/login/",
      "/health/",
      "/admin",
      "/admin/",
      "/account",
      "/account/",
      "/claim/",
      "/register",
      "/register/",
      "/forgot-password",
      "/forgot-password/",
      "/reset-password",
      "/reset-password/",
    ]);
  });

  it("points at the sitemap and host derived from the configured site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";

    const result = robots();

    expect(result.sitemap).toBe("https://ourvalleys.example/sitemap.xml");
    expect(result.host).toBe("https://ourvalleys.example");
  });

  it("falls back to the local development origin without a configured site URL", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const result = robots();

    expect(result.sitemap).toBe("http://localhost:3000/sitemap.xml");
    expect(result.host).toBe("http://localhost:3000");
  });
});
