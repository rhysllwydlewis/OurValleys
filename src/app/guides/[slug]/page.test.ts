import { describe, expect, it } from "vitest";
import { listPublicGuides } from "@/modules/guides/public";
import { generateMetadata } from "./page";

describe("generateMetadata", () => {
  it("returns a title, description and noindex robots for every known guide", async () => {
    for (const guide of listPublicGuides()) {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: guide.slug }),
      });

      expect(metadata.title).toBe(guide.title);
      expect(metadata.description).toBe(guide.summary);
      expect(metadata.robots).toEqual({ index: false, follow: false });
    }
  });

  it("returns a not-found title and description for an unknown slug", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "not-a-real-guide" }),
    });

    expect(metadata.title).toBe("Guide not found");
    expect(metadata.description).toBe(
      "The requested fictional representative guide is not available.",
    );
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
