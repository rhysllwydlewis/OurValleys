import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { buildBusinessesAtom } from "@/modules/syndication/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await listPublishedBusinesses({
    sort: "newest",
    pageSize: 48,
  });
  if (result.state !== "ready") return feedUnavailableResponse("Businesses");
  const xml = buildAtomFeed(buildBusinessesAtom(result.businesses));
  return new Response(xml, { headers: ATOM_HEADERS });
}
