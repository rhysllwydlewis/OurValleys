import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { buildStoriesAtom } from "@/modules/syndication/feeds";
import { listPublishedStories } from "@/modules/stories/public";

export const dynamic = "force-dynamic";

export async function GET() {
  // The feed is always English: a feed reader has no language preference.
  const stories = await listPublishedStories("en", 30);
  if (stories === null) return feedUnavailableResponse("Local news");
  const xml = buildAtomFeed(buildStoriesAtom(stories, new Date()));
  return new Response(xml, { headers: ATOM_HEADERS });
}
