import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      // Images are validated and capped at 5MB in the media module. The small
      // overhead allowance keeps multipart uploads within that product limit.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
