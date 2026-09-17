import { afterEach, describe, expect, it } from "vitest";
import { generateMetadata, generateStaticParams } from "./page";

describe("generateStaticParams", () => {
  it("advertises exactly the known policy routes", () => {
    expect(generateStaticParams()).toEqual([
      { policy: "privacy" },
      { policy: "terms" },
      { policy: "accessibility" },
      { policy: "content-guidelines" },
      { policy: "corrections" },
      { policy: "advertising" },
    ]);
  });
});

describe("generateMetadata", () => {
  const originalReleaseStage = process.env.OURVALLEYS_RELEASE_STAGE;

  afterEach(() => {
    if (originalReleaseStage === undefined) {
      delete process.env.OURVALLEYS_RELEASE_STAGE;
    } else {
      process.env.OURVALLEYS_RELEASE_STAGE = originalReleaseStage;
    }
  });

  it("returns a title and description for every known policy", async () => {
    const slugs = [
      "privacy",
      "terms",
      "accessibility",
      "content-guidelines",
      "corrections",
      "advertising",
    ] as const;

    for (const policy of slugs) {
      const metadata = await generateMetadata({
        params: Promise.resolve({ policy }),
      });
      expect(typeof metadata.title).toBe("string");
      expect((metadata.title as string).length).toBeGreaterThan(0);
      expect((metadata.title as string).endsWith("| OurValleys")).toBe(false);
      expect(typeof metadata.description).toBe("string");
      expect((metadata.description as string).length).toBeGreaterThan(0);
    }
  });

  it("returns empty metadata for an unknown policy slug", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ policy: "not-a-real-policy" }),
    });
    expect(metadata).toEqual({});
  });

  it("indexes the page only during public release", async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "private_pilot";
    const notPublic = await generateMetadata({
      params: Promise.resolve({ policy: "privacy" }),
    });
    expect(notPublic.robots).toEqual({ index: false, follow: false });

    process.env.OURVALLEYS_RELEASE_STAGE = "public";
    const isPublic = await generateMetadata({
      params: Promise.resolve({ policy: "privacy" }),
    });
    expect(isPublic.robots).toEqual({ index: true, follow: true });
  });
});
