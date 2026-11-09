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
