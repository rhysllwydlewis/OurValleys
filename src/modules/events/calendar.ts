import { getSiteUrl } from "@/lib/site";
import type { PublicEvent } from "@/modules/events/public";

const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const ICS_LINE_LIMIT = 75;

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
    .replace(/\r?\n/g, "\\n");
}

function foldIcsLine(line: string): string {
  if (line.length <= ICS_LINE_LIMIT) return line;
  const chunks: string[] = [line.slice(0, ICS_LINE_LIMIT)];
  let rest = line.slice(ICS_LINE_LIMIT);
  while (rest.length > 0) {
    chunks.push(rest.slice(0, ICS_LINE_LIMIT - 1));
    rest = rest.slice(ICS_LINE_LIMIT - 1);
  }
  return chunks.join("\r\n ");
}

export function resolveEventEnd(event: PublicEvent): Date {
  return (
    event.endsAt ??
    new Date(event.startsAt.getTime() + DEFAULT_EVENT_DURATION_MS)
  );
}

export function getEventDetailUrl(event: PublicEvent): string {
  return new URL(`/events/${event.id}`, getSiteUrl()).toString();
}

export function buildEventIcs(
  event: PublicEvent,
  now: Date = new Date(),
): string {
  const eventUrl = getEventDetailUrl(event);
  const descriptionParts = [event.description];
  if (event.bookingUrl) {
    descriptionParts.push(`Book or learn more: ${event.bookingUrl}`);
  }
  descriptionParts.push(`Event details: ${eventUrl}`);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OurValleys//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@${getSiteUrl().hostname}`,
    `DTSTAMP:${formatIcsDateTime(now)}`,
    `DTSTART:${formatIcsDateTime(event.startsAt)}`,
    `DTEND:${formatIcsDateTime(resolveEventEnd(event))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join("\n\n"))}`,
    ...(event.locationDisplay
      ? [`LOCATION:${escapeIcsText(event.locationDisplay)}`]
      : []),
    `URL:${eventUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export function buildGoogleCalendarUrl(event: PublicEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatIcsDateTime(event.startsAt)}/${formatIcsDateTime(resolveEventEnd(event))}`,
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
    enddt: resolveEventEnd(event).toISOString(),
    body: event.description,
  });
  if (event.locationDisplay) params.set("location", event.locationDisplay);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
