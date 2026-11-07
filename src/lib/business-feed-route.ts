import { feedUnavailableResponse } from "@/lib/atom";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { resolvePublishedBusinessRedirect } from "@/modules/businesses/public-operations";

export type FeedBusiness = {
  id: string;
  slug: string;
  name: string;
  fictional: boolean;
};

/**
 * Resolves the business behind a per-business feed URL. A slug that was
 * changed redirects permanently so subscribed readers keep working; an
 * unpublished, suspended or unknown business answers a plain 404 that is the
 * same for every cause, and an outage answers 503 rather than an empty feed.
 */
export async function resolveBusinessFeed(
  request: Request,
  businessSlug: string,
  suffix: string,
  what: string,
): Promise<{ business: FeedBusiness } | { response: Response }> {
  const result = await getPublishedBusinessBySlug(businessSlug);
  if (result.state === "unavailable") {
    return { response: feedUnavailableResponse(what) };
  }
  if (result.state === "missing") {
    const redirectSlug = await resolvePublishedBusinessRedirect(businessSlug);
    if (redirectSlug) {
      return {
        response: Response.redirect(
          new URL(`/b/${redirectSlug}/${suffix}`, request.url),
          308,
        ),
      };
    }
  }
  if (result.state !== "ready") {
    return {
      response: new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    };
  }
  const { business } = result;
  return {
    business: {
      id: business.id,
      slug: business.slug,
      name: business.tradingName,
      fictional: business.isDemo,
    },
  };
}
