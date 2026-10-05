import { describe, expect, it } from "vitest";
import { buildEventsFeedIcs } from "@/modules/events/calendar";
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
    expect(ics).toContain("DTEND:20261101T210000Z");
    expect(ics).toContain("SUMMARY:Quiz\\, night\\; fun");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("is a valid empty calendar when there are no events", () => {
    const ics = buildEventsFeedIcs([], "Empty", now);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });
});
