import { buildEventIcs } from "@/modules/events/calendar";
import { getPublicEvent } from "@/modules/events/public";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const result = await getPublicEvent(eventId);
  if (result.state !== "found")
    return new Response("Not found", { status: 404 });

  const ics = buildEventIcs(result.event);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8; method=PUBLISH",
      "Content-Disposition": `attachment; filename="${result.event.id}-ourvalleys-event.ics"`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
