import { ImageResponse } from "next/og";

export const alt = "OurValleys";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        backgroundColor: "#0b1d16",
        backgroundImage:
          "radial-gradient(circle at 82% 8%, rgba(232, 198, 163, 0.28), transparent 55%), linear-gradient(145deg, #0b1d16, #173f35)",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 112,
            height: 112,
            borderRadius: 28,
            backgroundImage: "linear-gradient(150deg, #1d4a3e, #0f3028)",
            color: "#e8c6a3",
            fontSize: 52,
            fontWeight: 600,
          }}
        >
          OV
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 600,
            color: "#f7efe4",
            letterSpacing: "-0.02em",
          }}
        >
          OurValleys
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 44,
          maxWidth: 880,
          fontSize: 34,
          lineHeight: 1.4,
          color: "#cbd9d1",
        }}
      >
        Discover local businesses, places and useful information across Rhondda
        Cynon Taf.
      </div>
    </div>,
    { ...size },
  );
}
