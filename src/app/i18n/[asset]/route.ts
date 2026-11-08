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
  request: Request,
  context: { params: Promise<{ asset: string }> },
) {
  return context.params.then(({ asset }) => {
    const parsed = parseCatalogueAsset(asset);
    if (!parsed) return new NextResponse("Not found", { status: 404 });
    const { body, hash, gzip, brotli } = catalogueAssetBody(parsed.locale);
    const current = hash === parsed.hash;
    const encoding = chooseEncoding(request.headers.get("accept-encoding"));
    const payload =
      encoding === "br" ? brotli : encoding === "gzip" ? gzip : body;
    return new NextResponse(payload as BodyInit, {
      headers: {
        Vary: "Accept-Encoding",
        ...(encoding ? { "Content-Encoding": encoding } : {}),
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": current
          ? "public, max-age=31536000, immutable"
          : "no-store",
      },
    });
  });
}

/**
 * Brotli, then gzip, among the encodings the client accepts; an encoding with
 * quality 0 is refused, and so is any other when only `identity` is wanted.
 */
export function chooseEncoding(header: string | null): "br" | "gzip" | null {
  const quality = new Map<string, number>();
  for (const part of (header ?? "").split(",")) {
    const [name, ...params] = part.trim().toLowerCase().split(";");
    if (!name) continue;
    const q = params
      .map((param) => /^\s*q\s*=\s*([0-9.]+)\s*$/.exec(param)?.[1])
      .find((value) => value !== undefined);
    quality.set(name.trim(), q === undefined ? 1 : Number(q));
  }
  const accepts = (name: string) => {
    const value = quality.get(name) ?? quality.get("*") ?? 0;
    return Number.isFinite(value) && value > 0;
  };
  if (accepts("br")) return "br";
  if (accepts("gzip")) return "gzip";
  return null;
}
