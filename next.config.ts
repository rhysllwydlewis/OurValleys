import type { NextConfig } from "next";

const publicRelease = process.env.OURVALLEYS_RELEASE_STAGE === "public";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    if (publicRelease) return [];
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
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
    ],
  },
  experimental: {
    serverActions: {
      // Images are validated and capped at 5MB in the media module. The small
      // overhead allowance keeps multipart uploads within that product limit.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
