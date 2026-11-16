import { describe, expect, it } from "vitest";
import {
  activeEventFilterCount,
  eventsFeedQuery,
  eventsHref,
  parseEventFilters,
  withEventFilters,
} from "./event-filters";

describe("event cost and access filters", () => {
  it("reads only the exact value 1", () => {
    expect(parseEventFilters({ free: "1", stepFree: "1" })).toMatchObject({
      free: true,
      stepFree: true,
    });
    for (const value of ["0", "true", "", "yes", undefined]) {
      expect(parseEventFilters({ free: value, stepFree: value })).toMatchObject(
        { free: false, stepFree: false },
      );
    }
  });

  it("round-trips through links, the calendar feed and clearing", () => {
    const filters = parseEventFilters({ free: "1", stepFree: "1", q: "quiz" });
    expect(eventsHref(filters)).toBe("/events?q=quiz&free=1&stepFree=1");
    expect(eventsFeedQuery(filters)).toBe("?q=quiz&free=1&stepFree=1");
    expect(eventsHref(withEventFilters(filters, { free: false }))).toBe(
      "/events?q=quiz&stepFree=1",
    );
    expect(eventsHref(parseEventFilters({}))).toBe("/events");
  });

  it("counts both filters as active", () => {
    expect(
      activeEventFilterCount(parseEventFilters({ free: "1", stepFree: "1" })),
    ).toBe(2);
    expect(activeEventFilterCount(parseEventFilters({}))).toBe(0);
  });
});

describe("event distance filter (doc 102)", () => {
  it("reads a place and an offered radius, defaulting the radius", () => {
    expect(parseEventFilters({ near: "tonypandy" })).toMatchObject({
      near: "tonypandy",
      radius: 8,
    });
    expect(
      parseEventFilters({ near: "tonypandy", radius: "15" }),
    ).toMatchObject({ radius: 15 });
    for (const radius of ["0", "-3", "999", "abc", ""]) {
      expect(parseEventFilters({ near: "x", radius }).radius).toBe(8);
    }
  });

  it("caps an oversized place value", () => {
    expect(parseEventFilters({ near: "a".repeat(500) }).near).toHaveLength(80);
  });

  it("round-trips through links and the calendar feed, omitting the default radius", () => {
    const filters = parseEventFilters({ near: "tonypandy", radius: "15" });
    expect(eventsHref(filters)).toBe("/events?near=tonypandy&radius=15");
    expect(eventsFeedQuery(filters)).toBe("?near=tonypandy&radius=15");
    expect(eventsHref(parseEventFilters({ near: "tonypandy" }))).toBe(
      "/events?near=tonypandy",
    );
  });

  it("never emits a radius without a place", () => {
    expect(eventsHref(parseEventFilters({ radius: "15" }))).toBe("/events");
  });

  it("counts as an active filter and clears with the chip", () => {
    const filters = parseEventFilters({ near: "tonypandy" });
    expect(activeEventFilterCount(filters)).toBe(1);
    expect(eventsHref(withEventFilters(filters, { near: "", radius: 8 }))).toBe(
      "/events",
    );
  });
});
