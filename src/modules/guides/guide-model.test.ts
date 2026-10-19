import { describe, expect, it } from "vitest";
import {
  assessGuideReadiness,
  buildGuideJsonLd,
  describeGuideIssues,
  estimateReadingMinutes,
  readingTimeLabel,
  relatedGuides,
  sectionAnchor,
  splitParagraphs,
  type ReadinessInput,
} from "./guide-model";

const now = new Date("2026-10-19T12:00:00Z");

function section(overrides: Partial<ReadinessInput["sections"][number]> = {}) {
  return {
    heading: "A section",
    body: "x".repeat(120),
    href: "",
    linkLabel: "",
    kind: "text" as const,
    ...overrides,
  };
}

function ready(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    summary: "A summary that is comfortably long enough to describe the guide.",
    readingTime: "1 minute read",
    placeId: "00000000-0000-4000-8000-000000000001",
    reviewDueAt: "2027-01-01",
    sections: [
      section({ href: "/businesses", linkLabel: "Search" }),
      section(),
      section({ kind: "tip" }),
    ],
    ...overrides,
  };
}

function failing(input: ReadinessInput) {
  return assessGuideReadiness(input, now)
    .checks.filter((check) => !check.ok)
    .map((check) => check.key);
}

describe("sectionAnchor", () => {
  it("is stable, accent-free and safe as an id", () => {
    expect(sectionAnchor({ id: "s2" })).toBe("part-s2");
  });
});

describe("splitParagraphs", () => {
  it("splits on blank lines and joins single line breaks", () => {
    expect(
      splitParagraphs("One\nstill one.\n\n  \nTwo.\n\n\n\nThree."),
    ).toEqual(["One still one.", "Two.", "Three."]);
  });
});

describe("reading time", () => {
  it("is at least a minute and grows at 200 words a minute", () => {
    expect(estimateReadingMinutes({ summary: "Short", sections: [] })).toBe(1);
    expect(
      estimateReadingMinutes({
        summary: "",
        sections: [{ heading: "H", body: "word ".repeat(401) }],
      }),
    ).toBe(3);
    expect(readingTimeLabel(4)).toBe("4 minute read");
  });
});

describe("assessGuideReadiness", () => {
  it("passes a complete guide with nothing to do", () => {
    const result = assessGuideReadiness(ready(), now);
    expect(result.canPublish).toBe(true);
    expect(failing(ready())).toEqual([]);
  });

  it("blocks on too few sections, a short summary, no onward link and a missing or past review date", () => {
    expect(
      failing(
        ready({
          sections: [section({ href: "/events", linkLabel: "Events" })],
        }),
      ),
    ).toContain("min_sections");
    expect(failing(ready({ summary: "Too short." }))).toContain(
      "summary_length",
    );
    expect(
      failing(ready({ sections: [section(), section(), section()] })),
    ).toContain("has_link");
    expect(
      failing(
        ready({
          sections: [section({ href: "/events" }), section(), section()],
        }),
      ),
    ).toContain("has_link");
    expect(failing(ready({ reviewDueAt: null }))).toContain("review_date");
    expect(failing(ready({ reviewDueAt: "2026-01-01" }))).toContain(
      "review_date",
    );
    expect(failing(ready({ reviewDueAt: "not a date" }))).toContain(
      "review_date",
    );
    for (const input of [
      ready({ reviewDueAt: null }),
      ready({ summary: "Too short." }),
    ]) {
      expect(assessGuideReadiness(input, now).canPublish).toBe(false);
    }
  });

  it("treats advice as advice: it never blocks publishing", () => {
    const input = ready({
      placeId: null,
      summary: "S".repeat(260),
      sections: [
        section({
          href: "/businesses",
          linkLabel: "Search",
          body: "short but ten chars",
        }),
        section(),
        section(),
      ],
    });
    const result = assessGuideReadiness(input, now);
    expect(result.canPublish).toBe(true);
    expect(failing(input)).toEqual(
      expect.arrayContaining([
        "place_linked",
        "summary_search",
        "thin_sections",
      ]),
    );
    const thin = result.checks.find((check) => check.key === "thin_sections");
    expect(thin?.sections).toEqual([1]);
  });

  it("flags a guide made only of tips and a reading time far from the length", () => {
    expect(
      failing(
        ready({
          sections: [
            section({ kind: "tip", href: "/events", linkLabel: "Events" }),
            section({ kind: "tip" }),
            section({ kind: "tip" }),
          ],
        }),
      ),
    ).toContain("tips_only");
    expect(failing(ready({ readingTime: "20 minute read" }))).toContain(
      "reading_time",
    );
    expect(failing(ready({ readingTime: "A quick read" }))).not.toContain(
      "reading_time",
    );
  });
});

describe("describeGuideIssues", () => {
  it("names the section number and the field", () => {
    expect(
      describeGuideIssues([
        { path: ["sections", 2, "href"], message: "link_path" },
        { path: ["sections", 0, "heading"], message: "Too small" },
        { path: ["sections", 1, "href"], message: "link_path_missing" },
        { path: ["slug"], message: "bad" },
        { path: ["sections"], message: "Too big" },
      ]),
    ).toEqual([
      "Section 3 link must be a path on this site, such as /businesses.",
      "Section 1 needs a heading of 2 to 120 characters.",
      "Section 2 has a link label but no link.",
      "Web address is not valid.",
      "Add between 1 and 12 sections.",
    ]);
  });
});

describe("relatedGuides", () => {
  const all = [
    { slug: "a", area: "Rhondda", placeId: "p1" },
    { slug: "b", area: "Taff", placeId: "p2" },
    { slug: "c", area: "Rhondda", placeId: null },
    { slug: "d", area: "Cynon", placeId: "p1" },
    { slug: "e", area: "Merthyr", placeId: null },
  ];

  it("prefers the same place, then the same area, then the newest, and never the guide itself", () => {
    const result = relatedGuides(
      { slug: "a", area: "Rhondda", placeId: "p1" },
      all,
      3,
    );
    expect(result.map((item) => item.slug)).toEqual(["d", "c", "b"]);
  });

  it("folds accents and case when comparing areas", () => {
    const result = relatedGuides(
      { slug: "z", area: "RHONDDA", placeId: null },
      all,
      1,
    );
    expect(result[0]?.slug).toBe("a");
  });
});

describe("buildGuideJsonLd", () => {
  it("describes an Article with its author and dates", () => {
    const data = buildGuideJsonLd(
      {
        slug: "coffee",
        title: "Coffee",
        summary: "About coffee",
        authorName: "Editorial team",
        publishedAt: new Date("2026-10-01T00:00:00Z"),
        updatedAt: new Date("2026-10-10T00:00:00Z"),
        sponsorshipDisclosure: null,
      },
      "https://ourvalleys.example",
      "en-GB",
    );
    expect(data["@type"]).toBe("Article");
    expect(data.url).toBe("https://ourvalleys.example/guides/coffee");
    expect(data.datePublished).toBe("2026-10-01T00:00:00.000Z");
    expect(data.author).toEqual({ "@type": "Person", name: "Editorial team" });
  });

  it("never reports a modified date before the published date", () => {
    const data = buildGuideJsonLd(
      {
        slug: "coffee",
        title: "Coffee",
        summary: "About coffee",
        authorName: "Editorial team",
        publishedAt: new Date("2026-10-15T00:00:00Z"),
        updatedAt: new Date("2026-10-01T00:00:00Z"),
        sponsorshipDisclosure: null,
      },
      "https://ourvalleys.example",
      "en-GB",
    );
    expect(data.dateModified).toBe("2026-10-15T00:00:00.000Z");
  });
});
