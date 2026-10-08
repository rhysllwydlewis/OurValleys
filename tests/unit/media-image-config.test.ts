import { describe, expect, it } from "vitest";
import {
  isOptimisableMediaUrl,
  mediaRemotePattern,
} from "@/lib/media-image-config";

describe("mediaRemotePattern", () => {
  it("restricts the optimiser to the media host's business/ path", () => {
    expect(mediaRemotePattern("https://media.ourvalleys.example")).toEqual({
      protocol: "https",
      hostname: "media.ourvalleys.example",
      port: "",
      pathname: "/business/**",
    });
    expect(mediaRemotePattern("https://cdn.example/media/")).toEqual({
      protocol: "https",
      hostname: "cdn.example",
      port: "",
      pathname: "/media/business/**",
    });
    expect(mediaRemotePattern("http://127.0.0.1:3200")).toMatchObject({
      protocol: "http",
      hostname: "127.0.0.1",
      port: "3200",
    });
  });

  it("returns nothing when the media host is not configured or not a web URL", () => {
    for (const value of [undefined, "", "  ", "not a url", "ftp://x.test/"]) {
      expect(mediaRemotePattern(value)).toBeNull();
    }
  });
});

describe("isOptimisableMediaUrl", () => {
  const base = "https://media.ourvalleys.example";

  it("accepts business pictures on the configured host", () => {
    expect(
      isOptimisableMediaUrl(`${base}/business/abc/offer/p.webp`, base),
    ).toBe(true);
  });

  it("refuses other hosts, schemes, ports and paths", () => {
    for (const url of [
      "https://evil.example/business/abc/offer/p.webp",
      "http://media.ourvalleys.example/business/abc/offer/p.webp",
      "https://media.ourvalleys.example:8443/business/abc/offer/p.webp",
      `${base}/other/p.webp`,
      `${base}/business`, // no trailing path
      `${base}/business/../secrets.txt`,
      "https://media.ourvalleys.example.evil.example/business/a/p.webp",
      "not a url",
    ]) {
      expect(isOptimisableMediaUrl(url, base)).toBe(false);
    }
  });

  it("is false when no media host is configured", () => {
    expect(isOptimisableMediaUrl(`${base}/business/a/p.webp`, undefined)).toBe(
      false,
    );
  });

  it("honours a path prefix on the media host", () => {
    const prefixed = "https://cdn.example/media";
    expect(
      isOptimisableMediaUrl(
        "https://cdn.example/media/business/a/p.webp",
        prefixed,
      ),
    ).toBe(true);
    expect(
      isOptimisableMediaUrl("https://cdn.example/business/a/p.webp", prefixed),
    ).toBe(false);
  });
});
