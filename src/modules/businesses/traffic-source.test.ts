import { describe, expect, it } from "vitest";
import {
  buildSourceBreakdown,
  classifyTrafficSource,
  isTrafficSource,
  normaliseTrafficSource,
  trafficSources,
} from "./traffic-source";

const ownHost = "www.ourvalleys.example";

describe("classifyTrafficSource", () => {
  const classify = (referrer: string | null | undefined) =>
    classifyTrafficSource({ referrer, ownHost });

  it("treats a missing, empty or unreadable referrer as direct", () => {
    expect(classify(undefined)).toBe("direct");
    expect(classify(null)).toBe("direct");
    expect(classify("")).toBe("direct");
    expect(classify("not a url")).toBe("direct");
    expect(classify("android-app://com.google.android.gm")).toBe("direct");
    expect(classify("javascript:alert(1)")).toBe("direct");
  });

  it("lets the QR code win over any referrer", () => {
    expect(
      classifyTrafficSource({
        referrer: "https://www.google.com/",
        ownHost,
        explicit: "qr",
      }),
    ).toBe("qr");
  });

  it("names the part of the platform a visitor came from", () => {
    const base = `https://${ownHost}`;
    expect(classify(`${base}/`)).toBe("home");
    expect(classify(`${base}/businesses?q=plumber`)).toBe("directory");
    expect(classify(`${base}/categories/plumbing`)).toBe("directory");
    expect(classify(`${base}/places/treorchy`)).toBe("directory");
    expect(classify(`${base}/search?q=cafe`)).toBe("search");
    expect(classify(`${base}/map`)).toBe("map");
    expect(classify(`${base}/events`)).toBe("whats_on");
    expect(classify(`${base}/offers`)).toBe("whats_on");
    expect(classify(`${base}/news/some-story`)).toBe("news_guides");
    expect(classify(`${base}/guides/moving-here`)).toBe("news_guides");
    expect(classify(`${base}/b/another-business`)).toBe("direct");
  });

  it("matches the own host with or without www and a port", () => {
    expect(
      classifyTrafficSource({
        referrer: "http://localhost:3000/search?q=x",
        ownHost: "localhost:3000",
      }),
    ).toBe("search");
    expect(
      classifyTrafficSource({
        referrer: "https://ourvalleys.example/map",
        ownHost: "www.ourvalleys.example",
      }),
    ).toBe("map");
  });

  it("recognises search engines and social networks", () => {
    expect(classify("https://www.google.com/")).toBe("search_engine");
    expect(classify("https://www.google.co.uk/search?q=x")).toBe(
      "search_engine",
    );
    expect(classify("https://duckduckgo.com/")).toBe("search_engine");
    expect(classify("https://l.facebook.com/l.php?u=x")).toBe("social");
    expect(classify("https://t.co/abc")).toBe("social");
    expect(classify("https://l.instagram.com/")).toBe("social");
    expect(classify("https://wa.me/447700900000")).toBe("social");
  });

  it("does not mistake look-alike hosts for a known one", () => {
    expect(classify("https://notgoogle.example.com/")).toBe("other_site");
    expect(classify("https://google.evil.example/")).toBe("other_site");
    expect(classify("https://evilfacebook.com/")).toBe("other_site");
    expect(classify("https://www.ourvalleys.example.evil.test/map")).toBe(
      "other_site",
    );
  });

  it("falls back to another website", () => {
    expect(classify("https://www.treorchychamber.example/members")).toBe(
      "other_site",
    );
  });
});

describe("normaliseTrafficSource", () => {
  it("keeps known labels, case-insensitively", () => {
    for (const source of trafficSources) {
      expect(normaliseTrafficSource(source)).toBe(source);
    }
    expect(normaliseTrafficSource(" QR ")).toBe("qr");
  });

  it("maps empty to direct and anything unknown to another website", () => {
    expect(normaliseTrafficSource(undefined)).toBe("direct");
    expect(normaliseTrafficSource("  ")).toBe("direct");
    expect(normaliseTrafficSource("https://evil.example/?x=1")).toBe(
      "other_site",
    );
    expect(normaliseTrafficSource("<script>")).toBe("other_site");
    expect(isTrafficSource("business_website")).toBe(false);
  });
});

describe("buildSourceBreakdown", () => {
  it("orders by count, folds unknown labels and drops empty rows", () => {
    const rows = buildSourceBreakdown([
      { source: "direct", count: 3 },
      { source: "qr", count: 5 },
      { source: "legacy-thing", count: 1 },
      { source: "https://x.example", count: 1 },
      { source: "map", count: 0 },
    ]);
    expect(rows.map((row) => [row.source, row.count])).toEqual([
      ["qr", 5],
      ["direct", 3],
      ["other_site", 2],
    ]);
    expect(rows.map((row) => row.percent)).toEqual([50, 30, 20]);
  });

  it("breaks ties in the fixed label order and handles no data", () => {
    expect(
      buildSourceBreakdown([
        { source: "direct", count: 2 },
        { source: "directory", count: 2 },
      ]).map((row) => row.source),
    ).toEqual(["directory", "direct"]);
    expect(buildSourceBreakdown([])).toEqual([]);
  });
});
