import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { resolveBusinessFeed } from "@/lib/business-feed-route";
import { listPublicEvents } from "@/modules/events/public";
import { buildBusinessEventsAtom } from "@/modules/syndication/feeds";

export const dynamic = "force-dynamic";

const FEED_LIMIT = 50;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessSlug: string }> },
) {
  const { businessSlug } = await params;
  const resolved = await resolveBusinessFeed(
    request,
    businessSlug,
    "events/feed.xml",
    "Business events",
  );
  if ("response" in resolved) return resolved.response;
  const { business } = resolved;
  const result = await listPublicEvents({
    business: business.slug,
    pageSize: FEED_LIMIT,
    locale: "en",
  });
  if (result.state !== "ready")
    return feedUnavailableResponse("Business events");
  const xml = buildAtomFeed(
    buildBusinessEventsAtom(business, result.events, new Date()),
  );
  return new Response(xml, { headers: ATOM_HEADERS });
}
