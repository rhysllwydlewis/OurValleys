import { getSiteUrl } from "@/lib/site";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { renderQrSvg } from "@/modules/businesses/qr-code";
import { readCampaignSource } from "@/modules/businesses/traffic-source";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessSlug: string }> },
) {
  const { businessSlug } = await params;
  const result = await getPublishedBusinessBySlug(businessSlug);
  if (result.state !== "ready")
    return new Response("Not found", { status: 404 });
  // The Share kit asks for a labelled code (`?source=print`); anything that is
  // not a known label falls back to the plain QR code.
  const source =
    readCampaignSource(new URL(request.url).searchParams.get("source")) ?? "qr";
  const destination = new URL(
    `/b/${result.business.slug}?source=${source}`,
    getSiteUrl(),
  ).toString();
  const svg = renderQrSvg(
    destination,
    `QR code for ${result.business.tradingName}`,
  );
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `inline; filename="${result.business.slug}-ourvalleys-qr.svg"`,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
