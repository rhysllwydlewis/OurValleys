import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { buildGuidesAtom } from "@/modules/syndication/feeds";
import { listPublicGuides } from "@/modules/guides/public";

export const dynamic = "force-dynamic";

export async function GET() {
  // The feed is always English: a feed reader has no language preference.
  const result = await listPublicGuides("en");
  if (result.state === "unavailable")
    return feedUnavailableResponse("Local guides");
  const xml = buildAtomFeed(
    buildGuidesAtom(result.guides.slice(0, 30), new Date()),
  );
  return new Response(xml, { headers: ATOM_HEADERS });
}
