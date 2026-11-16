import type { NextConfig } from "next";
import { mediaRemotePatterns } from "./src/lib/media-image-config";
import { mediaPublicBaseUrl } from "./src/lib/media-config";
import {
  SAME_ORIGIN_FRAME_SOURCE,
  sameOriginFrameHeaders,
  securityHeaders,
} from "./src/lib/security-headers";

const publicRelease = process.env.OURVALLEYS_RELEASE_STAGE === "public";
// The picture host: the site's own /media route for a private bucket, or the
// R2 public host. Read at build time, so a change needs a redeploy.
const mediaPatterns = mediaRemotePatterns(
  mediaPublicBaseUrl(process.env) ?? undefined,
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    const baseline = securityHeaders({
      production: process.env.NODE_ENV === "production",
    });
    return [
      {
        source: "/:path*",
        headers: [
          ...baseline,
          ...(publicRelease
            ? []
            : [
                {
                  key: "X-Robots-Tag",
                  value: "noindex, nofollow, noarchive",
                },
              ]),
        ],
      },
      // Later entries win for the same header name, so this replaces the
      // deny-all framing rule for the private preview only.
      {
        source: SAME_ORIGIN_FRAME_SOURCE,
        headers: sameOriginFrameHeaders({
          production: process.env.NODE_ENV === "production",
        }),
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "walesonline.co.uk",
      },
      {
        protocol: "https",
        hostname: "**.walesonline.co.uk",
      },
      // Uploaded pictures are resized by the optimiser instead of being sent to
      // every visitor at their original (up to 5MB) size.
      ...mediaPatterns,
    ],
  },
  experimental: {
    // Merging CSS across routes made every page download the stylesheets of
    // unrelated areas (about 235 KB of the 270 KB each route carried). The
    // graph strategy groups by what routes actually share.
    cssChunking: "graph",
    serverActions: {
      // Images are validated and capped at 5MB in the media module. The small
      // overhead allowance keeps multipart uploads within that product limit.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
