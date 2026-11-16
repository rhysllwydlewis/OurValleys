import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureGuideIds } from "@/lib/fixture-guides";
import { translatorFor } from "@/lib/i18n/translate";
import { getPublicGuideBySlug } from "@/modules/guides/public";
import { generateMetadata } from "./page";

vi.mock("@/modules/guides/public", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/guides/public")>()),
  getPublicGuideBySlug: vi.fn(async () => null),
}));

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

  describe("indexing at public release", () => {
    const originalStage = process.env.OURVALLEYS_RELEASE_STAGE;
    const published = (id: string) =>
      ({
        id,
        slug: "a-guide",
        title: "A guide",
        summary: "A summary",
      }) as Awaited<ReturnType<typeof getPublicGuideBySlug>>;

    afterEach(() => {
      if (originalStage === undefined) {
        delete process.env.OURVALLEYS_RELEASE_STAGE;
      } else {
        process.env.OURVALLEYS_RELEASE_STAGE = originalStage;
      }
      vi.mocked(getPublicGuideBySlug).mockReset();
      vi.mocked(getPublicGuideBySlug).mockResolvedValue(null);
    });

    it("indexes a real published guide", async () => {
      process.env.OURVALLEYS_RELEASE_STAGE = "public";
      vi.mocked(getPublicGuideBySlug).mockResolvedValue(
        published("00000000-0000-4000-8000-00000000abcd"),
      );

      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "a-guide" }),
      });

      expect(metadata.robots).toEqual({ index: true, follow: true });
    });

    it.each(Object.entries(fixtureGuideIds))(
      "never indexes the seeded fictional %s guide",
      async (_name, id) => {
        process.env.OURVALLEYS_RELEASE_STAGE = "public";
        vi.mocked(getPublicGuideBySlug).mockResolvedValue(published(id));

        const metadata = await generateMetadata({
          params: Promise.resolve({ slug: "a-guide" }),
        });

        expect(metadata.robots).toEqual({ index: false, follow: false });
      },
    );
  });
});
