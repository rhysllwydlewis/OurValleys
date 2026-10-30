import { describe, expect, it } from "vitest";
import {
  assessStory,
  buildStoryJsonLd,
  createStoryInputSchema,
  isWelshComplete,
  isWelshPartial,
  parseStoryBody,
  readingMinutes,
  slugFromTitle,
} from "./model";

const body =
  "The library reopens on Monday after a six month refit.\n\nA new reading room and a community café are included.";

const valid = {
  title: "Pontypridd library reopens",
  slug: "pontypridd-library-reopens",
  summary: "The refit is finished and doors open on Monday.",
  body,
  authorName: "OurValleys team",
};

describe("slugFromTitle", () => {
  it("lowercases, strips accents and joins words with hyphens", () => {
    expect(slugFromTitle("Café & Crwst: Pontypridd's Best!")).toBe(
      "cafe-and-crwst-pontypridd-s-best",
    );
  });

  it("never ends in a hyphen after truncation", () => {
    const slug = slugFromTitle(`${"word ".repeat(30)}end`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("createStoryInputSchema", () => {
  it("accepts a valid story and defaults the optional fields", () => {
    const result = createStoryInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.sponsorshipDisclosure).toBeNull();
    expect(result.data?.placeId).toBeNull();
    expect(result.data?.titleCy).toBe("");
  });

  it("rejects bad slugs, short bodies and a malformed place id", () => {
    expect(
      createStoryInputSchema.safeParse({ ...valid, slug: "Mixed-Case" }).data
        ?.slug,
    ).toBe("mixed-case");
    expect(
      createStoryInputSchema.safeParse({ ...valid, slug: "No Spaces" }).success,
    ).toBe(false);
    expect(
      createStoryInputSchema.safeParse({ ...valid, slug: "bad_slug!" }).success,
    ).toBe(false);
    expect(
      createStoryInputSchema.safeParse({ ...valid, body: "Too short" }).success,
    ).toBe(false);
    expect(
      createStoryInputSchema.safeParse({ ...valid, placeId: "nope" }).success,
    ).toBe(false);
  });
});

describe("parseStoryBody", () => {
  it("splits paragraphs on blank lines and joins soft line breaks", () => {
    expect(parseStoryBody("One\ntwo\n\nThree")).toEqual([
      { kind: "paragraph", text: "One two" },
      { kind: "paragraph", text: "Three" },
    ]);
  });

  it("turns '## ' lines into headings and ignores empty ones", () => {
    expect(parseStoryBody("## When\nOpens Monday.\n\n## \n\nDone")).toEqual([
      { kind: "heading", text: "When" },
      { kind: "paragraph", text: "Opens Monday." },
      { kind: "paragraph", text: "##" },
      { kind: "paragraph", text: "Done" },
    ]);
  });

  it("keeps markup as plain text", () => {
    const blocks = parseStoryBody(
      "<script>alert(1)</script> [x](javascript:y)",
    );
    expect(blocks).toEqual([
      {
        kind: "paragraph",
        text: "<script>alert(1)</script> [x](javascript:y)",
      },
    ]);
  });
});

describe("Welsh completeness", () => {
  const welsh = {
    titleCy: "Llyfrgell yn ailagor",
    summaryCy: "Mae'r gwaith wedi'i orffen a'r drysau'n agor ddydd Llun.",
    bodyCy:
      "Mae'r llyfrgell yn ailagor ddydd Llun ar ôl chwe mis o waith adnewyddu.\n\nMae ystafell ddarllen newydd hefyd.",
  };

  it("needs headline, summary and text", () => {
    expect(isWelshComplete(welsh)).toBe(true);
    expect(isWelshComplete({ ...welsh, bodyCy: "" })).toBe(false);
    expect(isWelshComplete({ titleCy: "", summaryCy: "", bodyCy: "" })).toBe(
      false,
    );
  });

  it("needs two paragraphs of Welsh text, like the English", () => {
    expect(isWelshComplete({ ...welsh, bodyCy: "x".repeat(120) })).toBe(false);
  });

  it("reports partial work only when something is written", () => {
    expect(isWelshPartial({ ...welsh, summaryCy: "" })).toBe(true);
    expect(isWelshPartial(welsh)).toBe(false);
    expect(isWelshPartial({ titleCy: "", summaryCy: "", bodyCy: "" })).toBe(
      false,
    );
  });
});

describe("assessStory", () => {
  const base = {
    ...valid,
    placeId: null,
    titleCy: "",
    summaryCy: "",
    bodyCy: "",
  };

  it("lets a two-paragraph story with its own summary publish", () => {
    expect(assessStory(base).canPublish).toBe(true);
  });

  it("blocks a one-paragraph story and a summary equal to the headline", () => {
    expect(
      assessStory({ ...base, body: "Only one paragraph here, long enough." })
        .canPublish,
    ).toBe(false);
    expect(
      assessStory({ ...base, summary: "  PONTYPRIDD library reopens " })
        .canPublish,
    ).toBe(false);
  });

  it("treats a place and Welsh as advice, not rules", () => {
    const checks = assessStory(base).checks;
    expect(checks.find((c) => c.id === "place")?.ok).toBe(false);
    expect(checks.find((c) => c.id === "welsh")?.ok).toBe(false);
  });
});

describe("readingMinutes and structured data", () => {
  it("never reports zero minutes", () => {
    expect(readingMinutes("short")).toBe(1);
    expect(readingMinutes("word ".repeat(1000))).toBe(5);
  });

  it("builds NewsArticle data from public fields only", () => {
    const data = buildStoryJsonLd(
      {
        title: "T",
        summary: "S",
        slug: "t-story",
        authorName: "A",
        publishedAt: new Date("2026-10-01T10:00:00Z"),
        updatedAt: new Date("2026-10-02T10:00:00Z"),
      },
      "https://example.test",
      "cy-GB",
    );
    expect(data).toMatchObject({
      "@type": "NewsArticle",
      url: "https://example.test/news/t-story",
      inLanguage: "cy-GB",
      datePublished: "2026-10-01T10:00:00.000Z",
    });
  });
});
