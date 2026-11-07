import { feedUnavailableResponse } from "@/lib/atom";
import { resolveBusinessFeed } from "@/lib/business-feed-route";
import { buildEventsFeedIcs } from "@/modules/events/calendar";
import { listPublicEvents } from "@/modules/events/public";

export const dynamic = "force-dynamic";

const FEED_EVENT_LIMIT = 200;

/**
 * A stable calendar subscription for one business. Unlike the filtered
 * platform feed it survives a slug change (permanent redirect) and a business
 * that is no longer public simply answers 404.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessSlug: string }> },
) {
  const { businessSlug } = await params;
  const resolved = await resolveBusinessFeed(
    request,
    businessSlug,
    "events/feed.ics",
    "Business events",
  );
  if ("response" in resolved) return resolved.response;
  const { business } = resolved;
  const result = await listPublicEvents({
    business: business.slug,
    pageSize: FEED_EVENT_LIMIT,
  });
  if (result.state !== "ready")
    return feedUnavailableResponse("Business events");
  const name = `${business.fictional ? "[Demo] " : ""}${business.name} events`;
  const ics = buildEventsFeedIcs(result.events, name);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${business.slug}-events.ics"`,
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
    },
  });
}
