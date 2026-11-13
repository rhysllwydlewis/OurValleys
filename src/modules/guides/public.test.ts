import { describe, expect, it } from "vitest";
import { reviveGuideDates, type PublicGuide } from "./public";

function guide(overrides: Record<string, unknown>): PublicGuide {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "g",
    title: "T",
    summary: "S",
    area: "Rhondda",
    readingTime: "3 min",
    authorName: "A",
    sponsorshipDisclosure: null,
    sections: [],
    placeId: null,
    place: null,
    publishedAt: null,
    updatedAt: new Date(0),
    contentLocale: "en",
    ...overrides,
  } as PublicGuide;
}

describe("reviveGuideDates", () => {
  it("turns cached ISO strings back into Dates", () => {
    const [revived] = reviveGuideDates([
      guide({
        publishedAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-02T10:00:00.000Z",
      }),
    ]);
    expect(revived?.publishedAt).toEqual(new Date("2026-10-01T10:00:00.000Z"));
    expect(revived?.updatedAt).toBeInstanceOf(Date);
  });

  it("keeps null and existing Date values", () => {
    const date = new Date("2026-10-03T00:00:00.000Z");
    const [revived] = reviveGuideDates([
      guide({ publishedAt: null, updatedAt: date }),
    ]);
    expect(revived?.publishedAt).toBeNull();
    expect(revived?.updatedAt).toEqual(date);
  });
});
