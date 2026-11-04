import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { listPublicUpdateFeed } from "@/modules/businesses/public-updates";
import { buildUpdatesAtom } from "@/modules/syndication/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  // The feed is always English: a feed reader has no language preference.
  const result = await listPublicUpdateFeed({ page: 1, locale: "en" });
  if (result.state === "unavailable") {
    return feedUnavailableResponse("Local updates");
  }
  const xml = buildAtomFeed(buildUpdatesAtom(result.updates, new Date()));
  return new Response(xml, { headers: ATOM_HEADERS });
}
