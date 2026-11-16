import { isServableMediaKey, mediaContentType } from "@/lib/media-config";
import { getMediaObject, isMediaStorageConfigured } from "@/lib/media-storage";

/**
 * Serves uploaded pictures and menu documents from the private bucket.
 *
 * A Railway Bucket has no public address, so visitors reach its files here.
 * The files are already public by design (the same unguessable address was
 * public on the R2 host), so there is no per-visitor check, but the route is
 * deliberately narrow:
 *
 * - Only object names of the exact shape the upload code creates are fetched
 *   (`isServableMediaKey`), so it cannot read anything else in the bucket.
 * - The content type comes from the file extension, never from the bucket.
 * - Responses are cacheable, so Cloudflare, in front of the site, serves
 *   repeat requests without reaching the bucket or this service.
 */
export const dynamic = "force-dynamic";

/** A day: long enough for the edge to absorb traffic, short enough that a removed picture stops being served. */
const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=86400";

type RouteContext = { params: Promise<{ key: string[] }> };

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "public, max-age=60" },
  });
}

function unavailable(status: number): Response {
  console.warn(JSON.stringify({ event: "media_storage_error", status }));
  return new Response("Media is temporarily unavailable.", {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "30" },
  });
}

async function serve(
  { params }: RouteContext,
  includeBody: boolean,
): Promise<Response> {
  const { key: segments } = await params;
  const key = segments.join("/");
  if (!isServableMediaKey(key) || !isMediaStorageConfigured()) {
    return notFound();
  }

  let upstream: Response;
  try {
    upstream = await getMediaObject(key);
  } catch {
    return unavailable(0);
  }
  if (upstream.status === 404) {
    await upstream.body?.cancel();
    return notFound();
  }
  if (!upstream.ok) {
    await upstream.body?.cancel();
    return unavailable(upstream.status);
  }

  const headers = new Headers({
    "Content-Type": mediaContentType(key),
    "Content-Disposition": "inline",
    "Cache-Control": CACHE_CONTROL,
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  const etag = upstream.headers.get("etag");
  if (etag) headers.set("ETag", etag);

  if (!includeBody) {
    await upstream.body?.cancel();
    return new Response(null, { status: 200, headers });
  }
  return new Response(upstream.body, { status: 200, headers });
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  return serve(context, true);
}

export async function HEAD(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  return serve(context, false);
}
