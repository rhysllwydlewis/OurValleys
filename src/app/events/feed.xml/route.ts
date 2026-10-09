import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { listPublicEvents } from "@/modules/events/public";
import { buildEventsAtom } from "@/modules/syndication/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await listPublicEvents({ pageSize: 50 });
  if (result.state !== "ready") return feedUnavailableResponse("Events");
  const xml = buildAtomFeed(buildEventsAtom(result.events, new Date()));
  return new Response(xml, { headers: ATOM_HEADERS });
}
