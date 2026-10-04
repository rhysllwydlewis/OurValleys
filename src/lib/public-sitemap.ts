import "server-only";
import { getDatabaseClient } from "@/lib/database/client";
import { isPublicRelease } from "@/lib/release-stage";

export type PublicSitemapEntry = {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
};

const publicStaticEntries: readonly PublicSitemapEntry[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/businesses", changeFrequency: "daily", priority: 0.9 },
  { path: "/policies", changeFrequency: "monthly", priority: 0.3 },
  { path: "/policies/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/policies/terms", changeFrequency: "monthly", priority: 0.3 },
  {
    path: "/policies/accessibility",
    changeFrequency: "monthly",
    priority: 0.3,
  },
  {
    path: "/policies/content-guidelines",
    changeFrequency: "monthly",
    priority: 0.3,
  },
  { path: "/policies/corrections", changeFrequency: "monthly", priority: 0.3 },
  { path: "/policies/advertising", changeFrequency: "monthly", priority: 0.3 },
];

export async function listEligiblePublicSitemapEntries(): Promise<
  PublicSitemapEntry[]
> {
  if (!isPublicRelease()) return [];

  try {
    const client = getDatabaseClient();
    const businesses = await client<Array<{ slug: string }>>`
      select b.slug
      from business b
      inner join business_publication bp
        on bp.business_id = b.id
        and bp.status = 'published'
        and bp.published_at is not null
      inner join business_site bs
        on bs.id = bp.business_site_id
        and bs.business_id = b.id
        and bs.status = 'published'
        and bs.published_at is not null
      where b.status = 'published'
        and b.suspended_at is null
        and b.is_demo = false
      order by b.slug
      limit 10000
    `;

    // Place pages are indexable (see getPublicPageRobots in the place route).
    // Skip `planned` areas: they have reference geography but no coverage yet.
    const places = await client<Array<{ slug: string }>>`
      select slug
      from place
      where status = 'active'
        and coverage_status in ('active', 'pilot', 'seeding')
      order by slug
      limit 1000
    `;

    // Guides are indexable (see getPublicPageRobots in the guide routes).
    const guides = await client<Array<{ slug: string }>>`
      select slug
      from guide
      where status = 'published'
      order by slug
      limit 1000
    `;

    return [
      ...publicStaticEntries,
      ...(guides.length > 0
        ? [
            {
              path: "/guides",
              changeFrequency: "weekly" as const,
              priority: 0.6,
            },
          ]
        : []),
      ...guides.map((record) => ({
        path: `/guides/${record.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...places.map((record) => ({
        path: `/places/${record.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...businesses.map((record) => ({
        path: `/b/${record.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return [...publicStaticEntries];
  }
}
