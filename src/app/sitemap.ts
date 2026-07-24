import type { MetadataRoute } from "next";
import { listEligiblePublicSitemapEntries } from "@/lib/public-sitemap";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const entries = await listEligiblePublicSitemapEntries();

  return entries.map((entry) => ({
    url: new URL(entry.path, siteUrl).toString(),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
