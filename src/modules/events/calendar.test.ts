import { describe, expect, it } from "vitest";
import {
  buildEventIcs,
  buildEventsFeedIcs,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
} from "@/modules/events/calendar";
import type { PublicEvent } from "@/modules/events/public";

function makeEvent(id: string, title: string): PublicEvent {
  return {
    id,
    title,
    description: "Quiz, with; special characters",
    locationDisplay: "The Hall",
    startsAt: new Date("2026-11-01T19:00:00Z"),
    endsAt: null,
    bookingUrl: null,
    businessName: "Example",
    businessSlug: "example",
    fictional: false,
  };
}

describe("buildEventsFeedIcs", () => {
  const now = new Date("2026-10-05T10:00:00Z");

  it("emits one calendar with a VEVENT per event and a refresh hint", () => {
    const ics = buildEventsFeedIcs(
      [makeEvent("a", "Quiz, night; fun"), makeEvent("b", "Market")],
      "OurValleys local events",
      now,
    );
    expect(ics.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("X-WR-CALNAME:OurValleys local events");
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT6H");
    expect(ics).toContain("DTSTART:20261101T190000Z");
    expect(ics).toContain("SUMMARY:Quiz\\, night\\; fun");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("is a valid empty calendar when there are no events", () => {
    const ics = buildEventsFeedIcs([], "Empty", now);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("adds a cost and access line only when the organiser stated something", () => {
    const silent = buildEventsFeedIcs([makeEvent("a", "Quiz")], "Cal", now);
    expect(silent).not.toContain("Cost and access");
    const stated = buildEventsFeedIcs(
      [{ ...makeEvent("a", "Quiz"), isFree: true, stepFree: true }],
      "Cal",
      now,
    );
    expect(stated.replace(/\r\n /g, "")).toContain(
      "Cost and access: Free · Step-free access",
    );
  });
});

describe("buildEventIcs", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  const octets = (line: string) => new TextEncoder().encode(line).length;

  it("does not invent an end time the organiser never gave", () => {
    const ics = buildEventIcs(makeEvent("a", "Quiz"), now);
    expect(ics).toContain("DTSTART:20261101T190000Z");
    expect(ics).not.toContain("DTEND");
  });

  it("states the end time when the organiser gave one", () => {
    const ics = buildEventIcs(
      { ...makeEvent("a", "Quiz"), endsAt: new Date("2026-11-01T22:30:00Z") },
      now,
    );
    expect(ics).toContain("DTEND:20261101T223000Z");
  });

  it("escapes every kind of line break, including a lone carriage return", () => {
    const ics = buildEventIcs(
      { ...makeEvent("a", "Quiz"), description: "One\rTwo\r\nThree\nFour" },
      now,
    );
    expect(ics.replace(/\r\n /g, "")).toContain(
      "DESCRIPTION:One\\nTwo\\nThree\\nFour",
    );
    // Every remaining carriage return belongs to a CRLF line break.
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("folds by UTF-8 octets without splitting a character", () => {
    const title = "Gŵyl y Gân ŵŷâêîôû 🎶 ".repeat(12).trim();
    const ics = buildEventIcs(makeEvent("a", title), now);
    const lines = ics.split("\r\n");
    for (const line of lines) expect(octets(line)).toBeLessThanOrEqual(75);
    // Unfolding gives back the exact text: no character was cut in half.
    expect(ics.replace(/\r\n /g, "")).toContain(`SUMMARY:${title}\r\n`);
    expect(ics).not.toContain("\uFFFD");
  });

  it("leaves a line of exactly 75 octets unfolded", () => {
    const title = "a".repeat(75 - "SUMMARY:".length);
    const ics = buildEventIcs(makeEvent("a", title), now);
    expect(ics).toContain(`SUMMARY:${title}\r\n`);
  });
});

describe("calendar links", () => {
  it("give Google a zero-length range and Outlook no end when none was given", () => {
    const event = makeEvent("a", "Quiz");
    expect(
      new URL(buildGoogleCalendarUrl(event)).searchParams.get("dates"),
    ).toBe("20261101T190000Z/20261101T190000Z");
    expect(
      new URL(buildOutlookCalendarUrl(event)).searchParams.has("enddt"),
    ).toBe(false);
  });

  it("carry the organiser's end time when there is one", () => {
    const event = {
      ...makeEvent("a", "Quiz"),
      endsAt: new Date("2026-11-01T22:30:00Z"),
    };
    expect(
      new URL(buildGoogleCalendarUrl(event)).searchParams.get("dates"),
    ).toBe("20261101T190000Z/20261101T223000Z");
    expect(
      new URL(buildOutlookCalendarUrl(event)).searchParams.get("enddt"),
    ).toBe("2026-11-01T22:30:00.000Z");
  });
});
