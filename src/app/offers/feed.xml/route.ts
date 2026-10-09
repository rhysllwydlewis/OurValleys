import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { listPublicOffers } from "@/modules/businesses/public-offers";
import { buildOffersAtom } from "@/modules/syndication/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await listPublicOffers();
  if (result.state !== "ready") return feedUnavailableResponse("Offers");
  const xml = buildAtomFeed(buildOffersAtom(result.offers, new Date()));
  return new Response(xml, { headers: ATOM_HEADERS });
}
