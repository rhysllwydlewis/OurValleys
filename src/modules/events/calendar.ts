import { EVENT_COST_WORDS_EN, eventCostSummary } from "./cost";
import { getSiteUrl } from "@/lib/site";
import type { PublicEvent } from "@/modules/events/public";

/** RFC 5545 §3.1: a content line is at most 75 octets, excluding the break. */
const ICS_LINE_OCTETS = 75;
const utf8 = new TextEncoder();

/**
 * Subscribed calendars may be reused for five minutes and no longer. There is
 * deliberately no stale-while-revalidate window: an edited or cancelled event
 * must not keep being served from a cache for an hour after the change.
 */
export const EVENTS_FEED_CACHE_CONTROL = "public, max-age=300";

function formatIcsDateTime(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds by UTF-8 octets, as the standard counts them, and never inside a
 * character: a Welsh or emoji-heavy title would otherwise run past the limit
 * or be split mid-sequence, which strict calendar apps reject.
 */
function foldIcsLine(line: string): string {
  if (utf8.encode(line).length <= ICS_LINE_OCTETS) return line;
  const chunks: string[] = [];
  let chunk = "";
  let octets = 0;
  // Continuation lines start with a space, which counts towards their limit.
  let limit = ICS_LINE_OCTETS;
  for (const character of line) {
    const size = utf8.encode(character).length;
    if (octets + size > limit) {
      chunks.push(chunk);
      chunk = "";
      octets = 0;
      limit = ICS_LINE_OCTETS - 1;
    }
    chunk += character;
    octets += size;
  }
  chunks.push(chunk);
  return chunks.join("\r\n ");
}

export function getEventDetailUrl(event: PublicEvent): string {
  return new URL(`/events/${event.id}`, getSiteUrl()).toString();
}

function buildVeventLines(event: PublicEvent, now: Date): string[] {
  const eventUrl = getEventDetailUrl(event);
  const descriptionParts = [event.description];
  if (event.bookingUrl) {
    descriptionParts.push(`Book or learn more: ${event.bookingUrl}`);
  }
  const cost = eventCostSummary(event, EVENT_COST_WORDS_EN);
  if (cost) descriptionParts.push(`Cost and access: ${cost}`);
  descriptionParts.push(`Event details: ${eventUrl}`);

  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@${getSiteUrl().hostname}`,
    `DTSTAMP:${formatIcsDateTime(now)}`,
    `DTSTART:${formatIcsDateTime(event.startsAt)}`,
    // No end is invented when the organiser gave none: without DTEND the
    // event simply starts at DTSTART, which is all the public page says too.
    ...(event.endsAt ? [`DTEND:${formatIcsDateTime(event.endsAt)}`] : []),
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join("\n\n"))}`,
    ...(event.locationDisplay
      ? [`LOCATION:${escapeIcsText(event.locationDisplay)}`]
      : []),
    `URL:${eventUrl}`,
    "END:VEVENT",
  ];
}

export function buildEventIcs(
  event: PublicEvent,
  now: Date = new Date(),
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OurValleys//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...buildVeventLines(event, now),
    "END:VCALENDAR",
  ];

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

/**
 * A subscribable calendar of several events. Calendar apps poll the feed, so
 * it carries a name and a refresh hint and uses the same stable UIDs as the
 * single-event download, letting both resolve to the same calendar entry.
 */
export function buildEventsFeedIcs(
  events: PublicEvent[],
  calendarName: string,
  now: Date = new Date(),
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OurValleys//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...events.flatMap((event) => buildVeventLines(event, now)),
    "END:VCALENDAR",
  ];

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export function buildGoogleCalendarUrl(event: PublicEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    // Google needs both ends of the range; repeating the start states only
    // what the organiser gave instead of inventing a finish time.
    dates: `${formatIcsDateTime(event.startsAt)}/${formatIcsDateTime(event.endsAt ?? event.startsAt)}`,
    details: event.description,
  });
  if (event.locationDisplay) params.set("location", event.locationDisplay);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(event: PublicEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startsAt.toISOString(),
    body: event.description,
  });
  if (event.endsAt) params.set("enddt", event.endsAt.toISOString());
  if (event.locationDisplay) params.set("location", event.locationDisplay);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
