import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { resolveBusinessFeed } from "@/lib/business-feed-route";
import { listPublicOffers } from "@/modules/businesses/public-offers";
import { buildBusinessOffersAtom } from "@/modules/syndication/feeds";

export const dynamic = "force-dynamic";

const FEED_LIMIT = 24;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessSlug: string }> },
) {
  const { businessSlug } = await params;
  const resolved = await resolveBusinessFeed(
    request,
    businessSlug,
    "offers/feed.xml",
    "Business offers",
  );
  if ("response" in resolved) return resolved.response;
  const { business } = resolved;
  const result = await listPublicOffers({
    business: business.slug,
    pageSize: FEED_LIMIT,
    sort: "newest",
    locale: "en",
  });
  if (result.state !== "ready")
    return feedUnavailableResponse("Business offers");
  const xml = buildAtomFeed(
    buildBusinessOffersAtom(business, result.offers, new Date()),
  );
  return new Response(xml, { headers: ATOM_HEADERS });
}
