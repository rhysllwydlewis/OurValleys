import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { listPublicOffers } from "@/modules/businesses/public-offers";
import { buildOffersAtom } from "@/modules/syndication/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  // Newest first, as a feed reader expects: the page's default order
  // (soonest-ending first) would keep a new offer out of a full feed.
  const result = await listPublicOffers({ sort: "newest", locale: "en" });
  if (result.state !== "ready") return feedUnavailableResponse("Offers");
  const xml = buildAtomFeed(buildOffersAtom(result.offers, new Date()));
  return new Response(xml, { headers: ATOM_HEADERS });
}
