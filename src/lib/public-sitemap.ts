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

    // Published local stories are indexable (see getPublicPageRobots).
    // Its own guard: a failure here must not drop every other URL.
    const stories = await client<Array<{ slug: string }>>`
      select slug
      from local_story
      where status = 'published'
      order by published_at desc, slug
      limit 1000
    `.catch(() => [] as Array<{ slug: string }>);

    // Live offers of real published businesses have their own indexable page.
    const offers = await client<Array<{ id: string }>>`
      select o.id
      from business_offer o
      inner join business b on b.id = o.business_id
      where o.status = 'active'
        and (o.starts_at is null or o.starts_at <= now())
        and (o.ends_at is null or o.ends_at >= now())
        and b.status = 'published'
        and b.suspended_at is null
        and b.is_demo = false
      order by o.updated_at desc, o.id
      limit 2000
    `;

    // Events still to come (or running) of real published businesses. The
    // event page resolves only these, so past events never accumulate here.
    // One URL per event, capped to the next 90 days of start dates.
    const events = await client<Array<{ id: string }>>`
      select e.id
      from business_event e
      inner join business b on b.id = e.business_id
      where e.status = 'active'
        and (
          (e.ends_at is null and e.starts_at >= now())
          or e.ends_at >= now()
        )
        and e.starts_at <= now() + interval '90 days'
        and b.status = 'published'
        and b.suspended_at is null
        and b.is_demo = false
      order by e.starts_at, e.id
      limit 2000
    `;

    // Catalogue entries (products, treatments, team) of real published
    // businesses. Only entries that already carry a stored id are listed:
    // older ones get theirs on the owner's next save. Its own guard.
    const catalogue = await client<Array<{ slug: string; id: string }>>`
      select b.slug, e.value ->> 'id' as id
      from business_category_section s
      inner join business b on b.id = s.business_id
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(s.content -> 'entries') = 'array'
          then s.content -> 'entries' else '[]'::jsonb end
      ) as e(value)
      where s.status = 'active'
        and s.section_type in ('products', 'treatments', 'team')
        and b.status = 'published'
        and b.suspended_at is null
        and b.is_demo = false
        and e.value ->> 'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      order by b.slug, s.sort_order, e.value ->> 'id'
      limit 5000
    `.catch(() => [] as Array<{ slug: string; id: string }>);

    // The photo gallery page of each real published business with photos.
    // Eligibility mirrors the public resolver (a published site and
    // publication, a primary active location, and an active category and
    // place), so the sitemap never advertises a gallery that answers 404.
    const galleries = await client<Array<{ slug: string }>>`
      select distinct b.slug
      from business_media m
      inner join business b on b.id = m.business_id
      inner join business_publication bp on bp.business_id = b.id
        and bp.status = 'published' and bp.published_at is not null
      inner join business_site bs on bs.id = bp.business_site_id
        and bs.business_id = b.id
        and bs.status = 'published' and bs.published_at is not null
      inner join category c on c.id = b.primary_category_id
        and c.status = 'active'
      inner join business_location bl on bl.business_id = b.id
        and bl.is_primary = true and bl.status = 'active'
      inner join place p on p.id = bl.place_id and p.status = 'active'
      where m.role = 'gallery'
        and m.status = 'active'
        and b.status = 'published'
        and b.suspended_at is null
        and b.is_demo = false
      order by b.slug
      limit 5000
    `.catch(() => [] as Array<{ slug: string }>);

    // Published business updates of real published businesses, with the same
    // eligibility as the public resolver (a published site and publication, a
    // primary active location, an active category and place), so the sitemap
    // never advertises an update page that answers 404. Its own guard.
    const updates = await client<Array<{ slug: string; id: string }>>`
      select b.slug, u.id
      from business_update u
      inner join business b on b.id = u.business_id
      inner join business_publication bp on bp.business_id = b.id
        and bp.status = 'published' and bp.published_at is not null
      inner join business_site bs on bs.id = bp.business_site_id
        and bs.business_id = b.id
        and bs.status = 'published' and bs.published_at is not null
      inner join category c on c.id = b.primary_category_id
        and c.status = 'active'
      inner join business_location bl on bl.business_id = b.id
        and bl.is_primary = true and bl.status = 'active'
      inner join place p on p.id = bl.place_id and p.status = 'active'
      where u.status = 'published'
        and u.published_at is not null
        and u.published_at <= now()
        and b.status = 'published'
        and b.suspended_at is null
        and b.is_demo = false
      order by u.published_at desc, u.id
      limit 5000
    `.catch(() => [] as Array<{ slug: string; id: string }>);

    return [
      ...publicStaticEntries,
      ...galleries.map((record) => ({
        path: `/b/${record.slug}/gallery`,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
      // The combined catalogue page of each business that has entries.
      ...[...new Set(catalogue.map((record) => record.slug))].map((slug) => ({
        path: `/b/${slug}/catalogue`,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
      ...catalogue.map((record) => ({
        path: `/b/${record.slug}/catalogue/${record.id}`,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
      // The updates list of each business that has posted, then each update.
      ...[...new Set(updates.map((record) => record.slug))].map((slug) => ({
        path: `/b/${slug}/updates`,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
      ...updates.map((record) => ({
        path: `/b/${record.slug}/updates/${record.id}`,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
      ...events.map((record) => ({
        path: `/events/${record.id}`,
        changeFrequency: "daily" as const,
        priority: 0.5,
      })),
      ...offers.map((record) => ({
        path: `/offers/${record.id}`,
        changeFrequency: "daily" as const,
        priority: 0.5,
      })),
      ...(stories.length > 0
        ? [
            {
              path: "/news/archive",
              changeFrequency: "weekly" as const,
              priority: 0.5,
            },
          ]
        : []),
      ...stories.map((record) => ({
        path: `/news/${record.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
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
