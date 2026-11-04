import {
  ATOM_HEADERS,
  buildAtomFeed,
  feedUnavailableResponse,
} from "@/lib/atom";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { listBusinessUpdates } from "@/modules/businesses/public-updates";
import { buildBusinessUpdatesAtom } from "@/modules/syndication/feeds";

export const dynamic = "force-dynamic";

const FEED_LIMIT = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessSlug: string }> },
) {
  const { businessSlug } = await params;
  const result = await getPublishedBusinessBySlug(businessSlug);
  if (result.state === "unavailable") {
    return feedUnavailableResponse("Business updates");
  }
  if (result.state !== "ready") {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const { business } = result;
  const updates = await listBusinessUpdates({
    businessId: business.id,
    locale: "en",
    limit: FEED_LIMIT,
  });
  if (updates.unavailable) return feedUnavailableResponse("Business updates");
  const xml = buildAtomFeed(
    buildBusinessUpdatesAtom(
      {
        name: business.tradingName,
        slug: business.slug,
        fictional: business.isDemo,
      },
      updates.updates,
      new Date(),
    ),
  );
  return new Response(xml, { headers: ATOM_HEADERS });
}
