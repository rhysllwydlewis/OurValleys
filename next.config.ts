import type { NextConfig } from "next";
import { mediaRemotePattern } from "./src/lib/media-image-config";
import { securityHeaders } from "./src/lib/security-headers";

const publicRelease = process.env.OURVALLEYS_RELEASE_STAGE === "public";
const mediaPattern = mediaRemotePattern(process.env.R2_PUBLIC_BASE_URL);

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
      ...(mediaPattern ? [mediaPattern] : []),
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
