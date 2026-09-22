import { describe, expect, it } from "vitest";
import {
  buildEventIcs,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  getEventDetailUrl,
  resolveEventEnd,
} from "@/modules/events/calendar";
import type { PublicEvent } from "@/modules/events/public";

function unfoldIcs(ics: string): string {
  return ics.replace(/\r\n /g, "");
}

function makeEvent(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Summer Fete",
    description: "A day of stalls, music and games for all ages.",
    locationDisplay: "Ynysangharad Park",
    startsAt: new Date("2026-07-04T13:00:00.000Z"),
    endsAt: new Date("2026-07-04T17:00:00.000Z"),
    bookingUrl: "https://example.test/tickets",
    businessName: "Pontypridd Community Trust",
    businessSlug: "pontypridd-community-trust",
    fictional: true,
    ...overrides,
  };
}

describe("resolveEventEnd", () => {
  it("uses the recorded end time when present", () => {
    const event = makeEvent();
    expect(resolveEventEnd(event)).toEqual(event.endsAt);
  });

  it("falls back to a two-hour duration when no end time is recorded", () => {
    const event = makeEvent({ endsAt: null });
    expect(resolveEventEnd(event)).toEqual(
      new Date("2026-07-04T15:00:00.000Z"),
    );
  });
});

describe("buildEventIcs", () => {
  it("produces a well-formed VEVENT with CRLF line endings", () => {
    const event = makeEvent();
    const ics = buildEventIcs(event, new Date("2026-06-01T09:00:00.000Z"));

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain(`UID:${event.id}@`);
    expect(ics).toContain("DTSTAMP:20260601T090000Z");
    expect(ics).toContain("DTSTART:20260704T130000Z");
    expect(ics).toContain("DTEND:20260704T170000Z");
    expect(ics).toContain("SUMMARY:Summer Fete");
    expect(ics).toContain("LOCATION:Ynysangharad Park");
    expect(ics).toContain(`URL:${getEventDetailUrl(event)}`);
  });

  it("defaults the end time when the event has no recorded end", () => {
    const event = makeEvent({ endsAt: null });
    const ics = buildEventIcs(event, new Date("2026-06-01T09:00:00.000Z"));

    expect(ics).toContain("DTSTART:20260704T130000Z");
    expect(ics).toContain("DTEND:20260704T150000Z");
  });

  it("omits the LOCATION line when no location is recorded", () => {
    const event = makeEvent({ locationDisplay: null });
    const ics = buildEventIcs(event);
    expect(ics).not.toContain("LOCATION:");
  });

  it("escapes commas, semicolons and newlines in free-text fields", () => {
    const event = makeEvent({
      title: "Fete, Fair & Fun; Bring wellies",
      description: "Rain plan:\nmoved indoors, weather permitting.",
    });
    const ics = buildEventIcs(event);

    expect(ics).toContain("SUMMARY:Fete\\, Fair & Fun\\; Bring wellies");
    expect(ics).toContain("Rain plan:\\nmoved indoors\\, weather permitting.");
  });

  it("folds lines longer than 75 octets with a leading space continuation", () => {
    const event = makeEvent({
      description: "x".repeat(200),
    });
    const ics = buildEventIcs(event);
    const rawLines = ics.split("\r\n");

    expect(rawLines.some((line) => line.length > 75)).toBe(false);
    expect(rawLines.some((line) => line.startsWith(" "))).toBe(true);
  });

  it("includes the booking URL in the description when present", () => {
    const event = makeEvent();
    const ics = unfoldIcs(buildEventIcs(event));
    expect(ics).toContain("Book or learn more: https://example.test/tickets");
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("encodes the event as a Google Calendar template link", () => {
    const event = makeEvent();
    const url = new URL(buildGoogleCalendarUrl(event));

    expect(url.origin + url.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Summer Fete");
    expect(url.searchParams.get("dates")).toBe(
      "20260704T130000Z/20260704T170000Z",
    );
    expect(url.searchParams.get("location")).toBe("Ynysangharad Park");
  });

  it("omits location when the event has none", () => {
    const event = makeEvent({ locationDisplay: null });
    const url = new URL(buildGoogleCalendarUrl(event));
    expect(url.searchParams.has("location")).toBe(false);
  });
});

describe("buildOutlookCalendarUrl", () => {
  it("encodes the event as an Outlook.com deep link", () => {
    const event = makeEvent();
    const url = new URL(buildOutlookCalendarUrl(event));

    expect(url.origin + url.pathname).toBe(
      "https://outlook.live.com/calendar/0/deeplink/compose",
    );
    expect(url.searchParams.get("subject")).toBe("Summer Fete");
    expect(url.searchParams.get("startdt")).toBe(event.startsAt.toISOString());
    expect(url.searchParams.get("enddt")).toBe(event.endsAt?.toISOString());
  });
});
