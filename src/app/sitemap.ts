import type { MetadataRoute } from "next";
import { getPublicSitemapPaths, getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return getPublicSitemapPaths().map((path) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
