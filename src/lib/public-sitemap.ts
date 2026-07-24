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
  { path: "/places", changeFrequency: "weekly", priority: 0.8 },
  { path: "/categories", changeFrequency: "weekly", priority: 0.8 },
  { path: "/events", changeFrequency: "daily", priority: 0.8 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.7 },
  { path: "/policies", changeFrequency: "monthly", priority: 0.3 },
  { path: "/policies/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/policies/terms", changeFrequency: "monthly", priority: 0.3 },
  { path: "/policies/accessibility", changeFrequency: "monthly", priority: 0.3 },
  { path: "/policies/content-guidelines", changeFrequency: "monthly", priority: 0.3 },
  { path: "/policies/corrections", changeFrequency: "monthly", priority: 0.3 },
  { path: "/policies/advertising", changeFrequency: "monthly", priority: 0.3 },
];

export async function listEligiblePublicSitemapEntries(): Promise<
  PublicSitemapEntry[]
> {
  if (!isPublicRelease()) return [];

  try {
    const client = getDatabaseClient();
    const [businesses, places, categories] = await Promise.all([
      client<Array<{ slug: string }>>`
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
        where b.status = 'published' and b.suspended_at is null
        order by b.slug
        limit 10000
      `,
      client<Array<{ slug: string }>>`
        select distinct p.slug
        from place p
        inner join business_location bl
          on bl.place_id = p.id and bl.status = 'active' and bl.is_primary = true
        inner join business b
          on b.id = bl.business_id and b.status = 'published' and b.suspended_at is null
        inner join business_publication bp
          on bp.business_id = b.id and bp.status = 'published' and bp.published_at is not null
        where p.status = 'active' and p.coverage_status in ('pilot', 'active')
        order by p.slug
        limit 1000
      `,
      client<Array<{ slug: string }>>`
        select distinct c.slug
        from category c
        inner join business b
          on b.primary_category_id = c.id and b.status = 'published' and b.suspended_at is null
        inner join business_publication bp
          on bp.business_id = b.id and bp.status = 'published' and bp.published_at is not null
        where c.status = 'active'
        order by c.slug
        limit 1000
      `,
    ]);

    return [
      ...publicStaticEntries,
      ...businesses.map((record) => ({
        path: `/b/${record.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...places.map((record) => ({
        path: `/places/${record.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...categories.map((record) => ({
        path: `/categories/${record.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return [...publicStaticEntries];
  }
}
