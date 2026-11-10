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
  /** Slug of the valley this place sits in, or null for places outside one. */
  valleySlug: string | null;
};

export type MapValley = {
  slug: string;
  name: string;
  welshName: string | null;
  placeCount: number;
  businessCount: number;
};

export type ValleysMap =
  | {
      state: "ready";
      places: MapPlace[];
      valleys: MapValley[];
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
  valley: { slug: string; name: string; welshName: string | null } | null;
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
        (
            select jsonb_build_object(
              'slug', v.slug,
              'name', v.canonical_name,
              'welshName', v.welsh_name
            )
            from place_relationship r
            inner join place v
              on v.id = r.parent_place_id
              and v.status = 'active'
              and v.place_type = 'valley'
            where r.child_place_id = p.id
              and r.relationship_type = 'contains'
            order by r.sort_order asc, v.slug asc
            limit 1
          ),
          -- A valley with businesses recorded against it belongs to itself.
          case when p.place_type = 'valley' then jsonb_build_object(
            'slug', p.slug, 'name', p.canonical_name, 'welshName', p.welsh_name
          ) end
        ) as valley,
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
      valleySlug: row.valley?.slug ?? null,
      topCategories: row.categories
        .slice(0, TOP_CATEGORIES_PER_PLACE)
        .map((category) => ({
          ...category,
          count: Number(category.count),
        })),
    }));

    // With a category chosen, a valley with none of it has nothing to show.
    const valleys = buildMapValleys(
      places,
      placeRows.flatMap((row) => (row.valley ? [row.valley] : [])),
    ).filter((valley) => !selectedSlug || valley.businessCount > 0);

    return {
      state: "ready",
      places,
      valleys,
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

/**
 * The valleys that have at least one mapped place, with how many places and
 * businesses they hold. Counts are sums over mapped places, so they agree
 * with the places drawn on the map; a business is recorded against exactly
 * one place, so nothing is counted twice.
 */
export function buildMapValleys(
  places: readonly Pick<MapPlace, "valleySlug" | "businessCount">[],
  valleyDetails: ReadonlyArray<{
    slug: string;
    name: string;
    welshName: string | null;
  }>,
): MapValley[] {
  const details = new Map(valleyDetails.map((valley) => [valley.slug, valley]));
  const totals = new Map<string, { places: number; businesses: number }>();
  for (const place of places) {
    if (!place.valleySlug || !details.has(place.valleySlug)) continue;
    const total = totals.get(place.valleySlug) ?? { places: 0, businesses: 0 };
    total.places += 1;
    total.businesses += place.businessCount;
    totals.set(place.valleySlug, total);
  }
  return [...totals.entries()]
    .map(([slug, total]) => ({
      slug,
      name: details.get(slug)!.name,
      welshName: details.get(slug)!.welshName,
      placeCount: total.places,
      businessCount: total.businesses,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}
