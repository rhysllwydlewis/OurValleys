import { ImageResponse } from "next/og";
import { getAccent } from "@/modules/businesses/appearance";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import {
  fitNameSize,
  parseShareImageShape,
  shareImageShapes,
} from "@/modules/businesses/share-kit-model";

export const dynamic = "force-dynamic";

/**
 * A branded picture of a published business for sharing: the social preview
 * when the business has no cover photo, and a download in three shapes
 * (`?shape=wide|square|story`) for posts and stories. It draws only public
 * text (name, category, place) in the colour the owner chose.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessSlug: string }> },
) {
  const { businessSlug } = await params;
  const result = await getPublishedBusinessBySlug(businessSlug);
  if (result.state !== "ready") {
    return new Response("Not found", { status: 404 });
  }
  const { business } = result;
  const shape = parseShareImageShape(
    new URL(request.url).searchParams.get("shape"),
  );
  const { width, height } = shareImageShapes[shape];
  const appearance = await getBusinessAppearance(business.id);
  const accent = getAccent(appearance.accentKey);
  const tall = shape !== "wide";
  const pad = Math.round(width * 0.075);
  const nameSize = fitNameSize(business.tradingName, {
    large: tall ? 132 : 96,
    medium: tall ? 100 : 72,
    small: tall ? 76 : 54,
  });

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        backgroundColor: accent.strong,
        backgroundImage: `radial-gradient(circle at 85% 6%, ${accent.primary}, transparent 60%), linear-gradient(150deg, ${accent.strong}, #0b1d16)`,
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#f7efe4",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: tall ? 40 : 30,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#e8c6a3",
        }}
      >
        {business.category.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: nameSize,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {business.tradingName}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: tall ? 52 : 38,
            color: "#cbd9d1",
          }}
        >
          {business.place.name}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: tall ? 40 : 30,
          color: "#cbd9d1",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: tall ? 88 : 68,
            height: tall ? 88 : 68,
            borderRadius: 20,
            backgroundColor: "#0f3028",
            color: "#e8c6a3",
            fontSize: tall ? 40 : 30,
            fontWeight: 600,
          }}
        >
          OV
        </div>
        <div style={{ display: "flex" }}>Find us on OurValleys</div>
      </div>
    </div>,
    { width, height },
  );
  // Public text only, so it may be cached; a rename shows within the hour.
  image.headers.set(
    "Cache-Control",
    "public, max-age=900, stale-while-revalidate=3600",
  );
  const download = new URL(request.url).searchParams.get("download");
  if (download === "1") {
    image.headers.set(
      "Content-Disposition",
      `attachment; filename="${business.slug}-ourvalleys-${shape}.png"`,
    );
  }
  return image;
}
