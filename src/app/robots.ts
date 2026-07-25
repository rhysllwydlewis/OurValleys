import type { MetadataRoute } from "next";
import { isPublicRelease } from "@/lib/release-stage";
import { getSiteUrl, protectedIndexingPaths } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  if (!isPublicRelease()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      host: siteUrl.origin,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...protectedIndexingPaths],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl.origin,
  };
}
