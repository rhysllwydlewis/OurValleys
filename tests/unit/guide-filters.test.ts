import { describe, expect, it } from "vitest";
import {
  filterGuides,
  guideAreaCounts,
  guidesHref,
  hasGuideFilters,
  parseGuideFilters,
} from "@/modules/guides/guide-filters";

const guides = [
  {
    slug: "trails",
    title: "Valley trails for a clear day",
    summary: "Walks above the Rhondda.",
    area: "The Valleys",
  },
  {
    slug: "porth",
    title: "A practical afternoon in Porth",
    summary: "Shops, a café and the park.",
    area: "Porth",
  },
  {
    slug: "porth-2",
    title: "Porth after dark",
    summary: "Evening food and music.",
    area: "Porth",
  },
];

describe("parseGuideFilters", () => {
  it("normalises untrusted text", () => {
    expect(parseGuideFilters({})).toEqual({ q: "", area: "" });
    expect(
      parseGuideFilters({ q: ["  walks   above "], area: "x".repeat(200) }),
    ).toEqual({ q: "walks above", area: "x".repeat(80) });
  });
});

describe("guidesHref", () => {
  it("builds short, encoded URLs", () => {
    const empty = parseGuideFilters({});
    expect(guidesHref(empty)).toBe("/guides");
    expect(guidesHref(empty, { q: "a&b", area: "The Valleys" })).toBe(
      "/guides?q=a%26b&area=The+Valleys",
    );
  });
});

describe("filterGuides", () => {
  it("filters by area ignoring case and accents", () => {
    const result = filterGuides(guides, { q: "", area: "PORTH" });
    expect(result.map((g) => g.slug)).toEqual(["porth", "porth-2"]);
  });

  it("needs every search word to appear somewhere in the guide", () => {
    expect(
      filterGuides(guides, { q: "cafe park", area: "" }).map((g) => g.slug),
    ).toEqual(["porth"]);
    expect(filterGuides(guides, { q: "zzz", area: "" })).toEqual([]);
  });

  it("returns everything when nothing is set", () => {
    expect(filterGuides(guides, { q: "", area: "" })).toHaveLength(3);
  });
});

describe("guideAreaCounts", () => {
  it("groups areas, most guides first", () => {
    expect(guideAreaCounts(guides)).toEqual([
      { area: "Porth", count: 2 },
      { area: "The Valleys", count: 1 },
    ]);
  });
});

describe("hasGuideFilters", () => {
  it("reports whether anything narrows the list", () => {
    expect(hasGuideFilters({ q: "", area: "" })).toBe(false);
    expect(hasGuideFilters({ q: "x", area: "" })).toBe(true);
  });
});
