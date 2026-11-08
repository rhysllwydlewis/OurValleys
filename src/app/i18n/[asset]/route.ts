import { NextResponse } from "next/server";
import {
  catalogueAssetBody,
  parseCatalogueAsset,
} from "@/lib/i18n/catalogue-asset";

/**
 * Serves the message catalogue script (see `catalogue-asset.ts`). The address
 * carries a hash of the content, so a matching request is cacheable forever.
 * A request whose hash this server does not recognise (a page rendered by the
 * previous release during a rolling deploy) still gets the current strings but
 * is never cached, so an old address cannot pin outdated text.
 */
export function GET(
  _request: Request,
  context: { params: Promise<{ asset: string }> },
) {
  return context.params.then(({ asset }) => {
    const parsed = parseCatalogueAsset(asset);
    if (!parsed) return new NextResponse("Not found", { status: 404 });
    const { body, hash } = catalogueAssetBody(parsed.locale);
    const current = hash === parsed.hash;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": current
          ? "public, max-age=31536000, immutable"
          : "no-store",
      },
    });
  });
}
