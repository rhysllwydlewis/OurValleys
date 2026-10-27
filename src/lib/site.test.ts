import { describe, expect, it } from "vitest";
import {
  getPublicSitemapPaths,
  getSiteUrl,
  pageUrlMetadata,
  protectedIndexingPaths,
} from "./site";

describe("public discovery policy", () => {
  it("normalises the configured site URL to the origin root", () => {
    expect(getSiteUrl("https://example.com/path?q=1#fragment").toString()).toBe(
      "https://example.com/",
    );
  });

  it("supports a safe local development URL without inventing a production domain", () => {
    expect(getSiteUrl("http://localhost:3000").toString()).toBe(
      "http://localhost:3000/",
    );
  });

  it("advertises only implemented public routes", () => {
    expect(getPublicSitemapPaths()).toEqual([
      "/",
      "/businesses",
      "/events",
      "/b/cwm-coil-heating",
    ]);
  });

  it("keeps protected and internal route families out of indexing", () => {
    expect(protectedIndexingPaths).toEqual([
      "/api/",
      "/dashboard/",
      "/login/",
      "/health/",
      "/admin",
      "/admin/",
      "/account",
      "/account/",
      "/claim/",
      "/invitations/",
      "/register",
      "/register/",
      "/forgot-password",
      "/forgot-password/",
      "/reset-password",
      "/reset-password/",
      "/unsubscribe/",
    ]);
  });
});

describe("pageUrlMetadata", () => {
  it("points canonical and og:url at the page, not the homepage", () => {
    const meta = pageUrlMetadata("/guides/a-b", {
      title: "T",
      description: "D",
      locale: "en_GB",
    });
    expect(meta.alternates).toEqual({ canonical: "/guides/a-b" });
    expect(meta.openGraph).toMatchObject({
      url: "/guides/a-b",
      locale: "en_GB",
      siteName: "OurValleys",
    });
  });

  it("keeps feed alternates alongside the canonical", () => {
    const meta = pageUrlMetadata("/events", {
      title: "T",
      locale: "cy_GB",
      types: { "application/atom+xml": "/events/feed.xml" },
    });
    expect(meta.alternates).toEqual({
      canonical: "/events",
      types: { "application/atom+xml": "/events/feed.xml" },
    });
    expect(meta.openGraph).not.toHaveProperty("description");
  });
});
