import { describe, expect, it } from "vitest";
import {
  hasOfferFilters,
  offerHref,
  offerUrgency,
  parseOfferFilters,
} from "@/modules/businesses/offer-filters";

describe("parseOfferFilters", () => {
  it("reads defaults from an empty query string", () => {
    expect(parseOfferFilters({})).toEqual({
      q: "",
      category: "",
      place: "",
      when: "",
      sort: "ending",
      page: 1,
    });
  });

  it("normalises untrusted values", () => {
    const parsed = parseOfferFilters({
      q: ["  coffee  ", "ignored"],
      category: "x".repeat(200),
      when: "forever",
      sort: "cheapest",
      page: "-4",
    });
    expect(parsed.q).toBe("coffee");
    expect(parsed.category).toHaveLength(80);
    expect(parsed.when).toBe("");
    expect(parsed.sort).toBe("ending");
    expect(parsed.page).toBe(1);
  });

  it("accepts the week range, the newest sort and a page", () => {
    const parsed = parseOfferFilters({
      when: "week",
      sort: "newest",
      page: "3",
    });
    expect(parsed).toMatchObject({ when: "week", sort: "newest", page: 3 });
  });
});

describe("offerHref", () => {
  it("leaves defaults out", () => {
    expect(offerHref({ q: "", sort: "ending", page: 1 })).toBe("/offers");
  });

  it("keeps every filter when one changes", () => {
    const filters = parseOfferFilters({
      q: "bread",
      category: "food",
      place: "tonypandy",
      when: "week",
      sort: "newest",
    });
    const href = offerHref(filters, { page: 2 });
    const params = new URL(href, "http://x").searchParams;
    expect(Object.fromEntries(params)).toEqual({
      q: "bread",
      category: "food",
      place: "tonypandy",
      when: "week",
      sort: "newest",
      page: "2",
    });
  });

  it("encodes typed text", () => {
    expect(offerHref({ q: "a&b=c" })).toBe("/offers?q=a%26b%3Dc");
  });
});

describe("hasOfferFilters", () => {
  it("ignores sort and page", () => {
    expect(
      hasOfferFilters(parseOfferFilters({ sort: "newest", page: "2" })),
    ).toBe(false);
    expect(hasOfferFilters(parseOfferFilters({ when: "week" }))).toBe(true);
  });
});

describe("offerUrgency", () => {
  it("grades the days left", () => {
    expect(offerUrgency(null)).toBe("open");
    expect(offerUrgency(0)).toBe("today");
    expect(offerUrgency(1)).toBe("soon");
    expect(offerUrgency(7)).toBe("soon");
    expect(offerUrgency(8)).toBe("later");
  });
});

describe("offerCalendarDays", () => {
  it("counts British calendar days, so later today is 0", async () => {
    const { offerCalendarDays } =
      await import("@/modules/businesses/offer-filters");
    const now = new Date("2026-10-14T09:00:00Z");
    expect(offerCalendarDays(null, now)).toBeNull();
    expect(offerCalendarDays(new Date("2026-10-14T20:00:00Z"), now)).toBe(0);
    expect(offerCalendarDays(new Date("2026-10-15T00:30:00Z"), now)).toBe(1);
    expect(offerCalendarDays(new Date("2026-10-21T10:00:00Z"), now)).toBe(7);
    expect(offerCalendarDays(new Date("2026-10-13T10:00:00Z"), now)).toBe(0);
  });
});
