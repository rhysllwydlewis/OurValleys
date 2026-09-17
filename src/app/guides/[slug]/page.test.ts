import { describe, expect, it } from "vitest";
import { generateMetadata } from "./page";

describe("generateMetadata", () => {
  it("returns a not-found title and description for an unknown slug", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "not-a-real-guide" }),
    });

    expect(metadata.title).toBe("Guide not found");
    expect(metadata.description).toBe("The requested guide is not available.");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
