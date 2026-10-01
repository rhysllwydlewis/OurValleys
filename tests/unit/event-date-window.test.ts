import { describe, expect, it } from "vitest";
import {
  parseEventWhen,
  resolveEventWindow,
} from "@/modules/events/date-window";

describe("parseEventWhen", () => {
  it("accepts known values and rejects everything else", () => {
    expect(parseEventWhen("today")).toBe("today");
    expect(parseEventWhen("weekend")).toBe("weekend");
    expect(parseEventWhen("week")).toBe("week");
    expect(parseEventWhen("tomorrow")).toBeNull();
    expect(parseEventWhen("")).toBeNull();
    expect(parseEventWhen(undefined)).toBeNull();
  });
});

describe("resolveEventWindow", () => {
  // Wednesday 14 Oct 2026, 10:30 BST (09:30 UTC).
  const wednesday = new Date("2026-10-14T09:30:00Z");

  it("ends 'today' at the next London midnight", () => {
    const window = resolveEventWindow("today", wednesday);
    expect(window.from).toEqual(wednesday);
    expect(window.to.toISOString()).toBe("2026-10-14T23:00:00.000Z");
  });

  it("spans the coming Saturday and Sunday on a weekday", () => {
    const window = resolveEventWindow("weekend", wednesday);
    expect(window.from.toISOString()).toBe("2026-10-16T23:00:00.000Z");
    expect(window.to.toISOString()).toBe("2026-10-18T23:00:00.000Z");
  });

  it("starts the weekend window now when it is already Saturday or Sunday", () => {
    const saturday = new Date("2026-10-17T12:00:00Z");
    const sunday = new Date("2026-10-18T12:00:00Z");
    expect(resolveEventWindow("weekend", saturday).from).toEqual(saturday);
    expect(resolveEventWindow("weekend", saturday).to.toISOString()).toBe(
      "2026-10-18T23:00:00.000Z",
    );
    expect(resolveEventWindow("weekend", sunday).to.toISOString()).toBe(
      "2026-10-18T23:00:00.000Z",
    );
  });

  it("covers seven London days for 'week', across the clocks going back", () => {
    // Clocks go back on Sunday 25 Oct 2026; midnight then is 00:00 GMT.
    const window = resolveEventWindow("week", new Date("2026-10-22T09:00:00Z"));
    expect(window.to.toISOString()).toBe("2026-10-29T00:00:00.000Z");
  });

  it("uses the London date, not the UTC date, just after local midnight", () => {
    // 00:30 BST on Thursday is still Wednesday 23:30 UTC.
    const window = resolveEventWindow(
      "today",
      new Date("2026-10-14T23:30:00Z"),
    );
    expect(window.to.toISOString()).toBe("2026-10-15T23:00:00.000Z");
  });
});
