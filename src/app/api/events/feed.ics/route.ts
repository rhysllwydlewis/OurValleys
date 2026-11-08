import { buildEventsFeedIcs } from "@/modules/events/calendar";
import { parseEventWhen } from "@/modules/events/date-window";
import { monthWindow, parseEventMonth } from "@/modules/events/month";
import { parseEventWeek, weekWindow } from "@/modules/events/week";
import { listPublicEvents } from "@/modules/events/public";

export const dynamic = "force-dynamic";

const FEED_EVENT_LIMIT = 200;

function param(url: URL, name: string): string | undefined {
  return url.searchParams.get(name)?.slice(0, 80) || undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // A month or a week scopes the feed to that period; a malformed value is
  // ignored rather than guessed, which leaves the plain upcoming feed.
  const month = parseEventMonth(param(url, "month"));
  const week = month ? null : parseEventWeek(param(url, "week"));
  const window = month
    ? monthWindow(month)
    : week
      ? weekWindow(week)
      : undefined;
  const result = await listPublicEvents({
    query: param(url, "q"),
    category: param(url, "category"),
    place: param(url, "place"),
    business: url.searchParams.get("business")?.slice(0, 200) || undefined,
    when: window
      ? undefined
      : (parseEventWhen(param(url, "when")) ?? undefined),
    window,
    pageSize: FEED_EVENT_LIMIT,
  });
  if (result.state !== "ready")
    return new Response("Events are temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "300" },
    });

  const ics = buildEventsFeedIcs(
    result.events,
    month
      ? `OurValleys local events, ${month}`
      : week
        ? `OurValleys local events, week of ${week}`
        : "OurValleys local events",
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="ourvalleys-events${month ? `-${month}` : week ? `-week-${week}` : ""}.ics"`,
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
    },
  });
}
