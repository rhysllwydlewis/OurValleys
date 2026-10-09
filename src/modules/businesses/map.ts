import "server-only";
import { getDatabaseClient } from "@/lib/database/client";

/**
 * Data behind the public valleys map. Positions are public locality centroids
 * (`place_coordinate`); counts use the same publication and visibility rules
 * as the directory, so the map can never show a business the directory hides,
 * and no per-business or address data is returned at all.
 */

export type MapCategoryCount = {
  slug: string;
  name: string;
  welshLabel: string | null;
  count: number;
};

export type MapPlace = {
  slug: string;
  name: string;
  welshName: string | null;
  coverageStatus: string;
  latitude: number;
  longitude: number;
  businessCount: number;
  topCategories: MapCategoryCount[];
};

export type ValleysMap =
  | {
      state: "ready";
      places: MapPlace[];
      categories: MapCategoryCount[];
      selectedCategory: MapCategoryCount | null;
      totalBusinesses: number;
    }
  | { state: "unavailable" };

type PlaceRow = {
  slug: string;
  name: string;
  welsh_name: string | null;
  coverage_status: string;
  latitude: number;
  longitude: number;
  business_count: number;
  categories: Array<{
    slug: string;
    name: string;
    welshLabel: string | null;
    count: number;
  }>;
};

type CategoryRow = {
  slug: string;
  name: string;
  welsh_label: string | null;
  count: number;
};

const TOP_CATEGORIES_PER_PLACE = 3;

function normaliseSlug(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase().slice(0, 80);
  return trimmed && /^[a-z0-9-]+$/.test(trimmed) ? trimmed : null;
}

/**
 * Every active place with a coordinate, with how many published businesses it
 * has (optionally within one category), plus the categories that currently
 * have businesses. An unknown category is ignored rather than producing an
 * empty map; a database failure yields `unavailable` so the page can say so.
 */
export async function getValleysMap(
  input: { category?: string | null } = {},
): Promise<ValleysMap> {
  const requested = normaliseSlug(input.category);

  try {
    const client = getDatabaseClient();

    const categoryRows = await client<CategoryRow[]>`
      select c.slug, c.name, c.welsh_label, count(distinct b.id)::int as count
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
      inner join category c
        on c.id = b.primary_category_id
        and c.status = 'active'
      inner join business_location bl
        on bl.business_id = b.id
        and bl.status = 'active'
        and bl.is_primary = true
      inner join place p
        on p.id = bl.place_id
        and p.status = 'active'
      inner join place_coordinate pc
        on pc.place_id = p.id
      where b.status = 'published'
        and b.suspended_at is null
      group by c.id
      order by count(distinct b.id) desc, c.name asc
    `;

    const categories: MapCategoryCount[] = categoryRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      welshLabel: row.welsh_label,
      count: Number(row.count),
    }));
    // A real category with no businesses yet is still a valid filter (an
    // empty map), so validate against the active category table, not only
    // the categories that currently have businesses.
    let selectedCategory: MapCategoryCount | null = null;
    if (requested) {
      const [row] = await client<
        Array<{ slug: string; name: string; welsh_label: string | null }>
      >`
        select slug, name, welsh_label
        from category
        where slug = ${requested} and status = 'active'
        limit 1
      `;
      if (row) {
        selectedCategory = {
          slug: row.slug,
          name: row.name,
          welshLabel: row.welsh_label,
          count:
            categories.find((category) => category.slug === row.slug)?.count ??
            0,
        };
      }
    }
    const selectedSlug = selectedCategory?.slug ?? null;

    const placeRows = await client<PlaceRow[]>`
      with visible as (
        select b.id as business_id, bl.place_id,
          c.slug as category_slug, c.name as category_name,
          c.welsh_label as category_welsh_label
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
        inner join category c
          on c.id = b.primary_category_id
          and c.status = 'active'
        inner join business_location bl
          on bl.business_id = b.id
          and bl.status = 'active'
          and bl.is_primary = true
        where b.status = 'published'
          and b.suspended_at is null
          and (${selectedSlug}::text is null or c.slug = ${selectedSlug})
      ),
      per_category as (
        select place_id, category_slug, category_name, category_welsh_label,
          count(*)::int as n
        from visible
        group by place_id, category_slug, category_name, category_welsh_label
      )
      select p.slug, p.canonical_name as name, p.welsh_name,
        p.coverage_status, pc.latitude, pc.longitude,
        coalesce(sum(pcat.n), 0)::int as business_count,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'slug', pcat.category_slug,
              'name', pcat.category_name,
              'welshLabel', pcat.category_welsh_label,
              'count', pcat.n
            )
            order by pcat.n desc, pcat.category_name asc
          ) filter (where pcat.category_slug is not null),
          '[]'::jsonb
        ) as categories
      from place p
      inner join place_coordinate pc on pc.place_id = p.id
      left join per_category pcat on pcat.place_id = p.id
      where p.status = 'active'
      group by p.id, pc.latitude, pc.longitude
      -- Regions and valleys are aggregates, not localities: show one only
      -- when a business is recorded directly against it.
      having p.place_type in ('town', 'village', 'neighbourhood')
        or coalesce(sum(pcat.n), 0) > 0
      order by p.canonical_name asc, p.slug asc
    `;

    const places: MapPlace[] = placeRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      welshName: row.welsh_name,
      coverageStatus: row.coverage_status,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      businessCount: Number(row.business_count),
      topCategories: row.categories
        .slice(0, TOP_CATEGORIES_PER_PLACE)
        .map((category) => ({
          ...category,
          count: Number(category.count),
        })),
    }));

    return {
      state: "ready",
      places,
      categories,
      selectedCategory,
      totalBusinesses: places.reduce(
        (sum, place) => sum + place.businessCount,
        0,
      ),
    };
  } catch {
    return { state: "unavailable" };
  }
}
