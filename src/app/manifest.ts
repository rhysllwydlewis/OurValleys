import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OurValleys",
    short_name: "OurValleys",
    description:
      "Discover local businesses, places and useful information across Rhondda Cynon Taf.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1d16",
    theme_color: "#173f35",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
