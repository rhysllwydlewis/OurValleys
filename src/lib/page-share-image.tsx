import { ImageResponse } from "next/og";
import { fitNameSize } from "@/modules/businesses/share-kit-model";

export const pageShareImageSize = { width: 1200, height: 630 };
export const pageShareImageContentType = "image/png";

const SHORT_CACHE = "public, max-age=300, s-maxage=300";

/**
 * The social preview for a place or guide page: the same dark-green card as
 * the site-wide image, with the page's own title instead of the generic line.
 * Only public text is drawn.
 */
export function renderPageShareImage({
  eyebrow,
  title,
  summary,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
}): ImageResponse {
  const titleSize = fitNameSize(title, { large: 96, medium: 76, small: 58 });
  const blurb =
    summary && summary.length > 150 ? `${summary.slice(0, 147)}…` : summary;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        backgroundColor: "#0b1d16",
        backgroundImage:
          "radial-gradient(circle at 82% 8%, rgba(232, 198, 163, 0.28), transparent 55%), linear-gradient(145deg, #0b1d16, #173f35)",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#f7efe4",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 32,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#e8c6a3",
        }}
      >
        {eyebrow}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        {blurb ? (
          <div
            style={{
              display: "flex",
              fontSize: 32,
              lineHeight: 1.4,
              color: "#cbd9d1",
            }}
          >
            {blurb}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundImage: "linear-gradient(150deg, #1d4a3e, #0f3028)",
            color: "#e8c6a3",
            fontSize: 30,
            fontWeight: 600,
          }}
        >
          OV
        </div>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 600 }}>
          OurValleys
        </div>
      </div>
    </div>,
    {
      ...pageShareImageSize,
      headers: { "Cache-Control": SHORT_CACHE },
    },
  );
}
