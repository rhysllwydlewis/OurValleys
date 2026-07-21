import { getSiteUrl } from "@/lib/site";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { renderQrSvg } from "@/modules/businesses/qr-code";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessSlug: string }> },
) {
  const { businessSlug } = await params;
  const result = await getPublishedBusinessBySlug(businessSlug);
  if (result.state !== "ready")
    return new Response("Not found", { status: 404 });
  const destination = new URL(
    `/b/${result.business.slug}?source=qr`,
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
