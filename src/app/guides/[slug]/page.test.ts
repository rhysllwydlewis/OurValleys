import { describe, expect, it, vi } from "vitest";
import { translatorFor } from "@/lib/i18n/translate";
import { generateMetadata } from "./page";

vi.mock("@/lib/i18n/server", () => ({
  getTranslator: async () => ({ locale: "en", t: translatorFor("en") }),
}));

describe("generateMetadata", () => {
  it("returns a not-found title and description for an unknown slug", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "not-a-real-guide" }),
    });

    expect(metadata.title).toBe("Guide not found");
    expect(metadata.description).toBe("The requested guide is not available.");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("has a Welsh not-found title in the catalogue", async () => {
    expect(translatorFor("cy")("guide.notFoundTitle")).toBe(
      "Heb ddod o hyd i’r canllaw",
    );
  });
});
