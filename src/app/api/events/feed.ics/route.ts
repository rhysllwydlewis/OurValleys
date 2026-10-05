import { buildEventsFeedIcs } from "@/modules/events/calendar";
import { parseEventWhen } from "@/modules/events/date-window";
import { listPublicEvents } from "@/modules/events/public";

export const dynamic = "force-dynamic";

const FEED_EVENT_LIMIT = 200;

function param(url: URL, name: string): string | undefined {
  return url.searchParams.get(name)?.slice(0, 80) || undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await listPublicEvents({
    query: param(url, "q"),
    category: param(url, "category"),
    place: param(url, "place"),
    when: parseEventWhen(param(url, "when")) ?? undefined,
    pageSize: FEED_EVENT_LIMIT,
  });
  if (result.state !== "ready")
    return new Response("Events are temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "300" },
    });

  const ics = buildEventsFeedIcs(result.events, "OurValleys local events");
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ourvalleys-events.ics"',
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
    },
  });
}
