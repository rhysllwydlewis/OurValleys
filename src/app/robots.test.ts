import { afterEach, describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
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

  it("blocks every crawler outside public release", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";
    process.env.OURVALLEYS_RELEASE_STAGE = "private_pilot";

    const result = robots();

    expect(result.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(result.sitemap).toBeUndefined();
  });

  it("allows public pages while disallowing protected route families", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";
    process.env.OURVALLEYS_RELEASE_STAGE = "public";

    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules).toMatchObject({ userAgent: "*", allow: "/" });
    expect(rules?.disallow).toContain("/api/");
    expect(rules?.disallow).toContain("/dashboard/");
    expect(rules?.disallow).toContain("/admin/");
    expect(rules?.disallow).toContain("/account/");
    expect(result.sitemap).toBe("https://ourvalleys.example/sitemap.xml");
    expect(result.host).toBe("https://ourvalleys.example");
  });

  it("blocks every signed-in and account route, including the bare path", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ourvalleys.example";
    process.env.OURVALLEYS_RELEASE_STAGE = "public";

    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = [rules?.disallow ?? []].flat();
    // robots.txt matches by prefix: "/login/" does not cover "/login".
    const blocked = (path: string) =>
      disallow.some((prefix) => path.startsWith(prefix));

    for (const path of [
      "/login",
      "/login?next=/account",
      "/dashboard",
      "/dashboard/business/abc",
      "/account",
      "/account/settings",
      "/admin",
      "/admin/users",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/claim/abc",
      "/invitations/abc",
      "/unsubscribe/abc",
      "/api/ready",
    ]) {
      expect(blocked(path), path).toBe(true);
    }
    for (const path of ["/", "/businesses", "/places/treorchy", "/policies"]) {
      expect(blocked(path), path).toBe(false);
    }
  });

  it("falls back to the local development origin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.OURVALLEYS_RELEASE_STAGE = "development";

    expect(robots().host).toBe("http://localhost:3000");
  });
});
