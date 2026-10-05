import "server-only";
import { getDatabaseClient } from "@/lib/database/client";

export type SearchSuggestionKind = "business" | "category" | "place";

export type SearchSuggestion = {
  kind: SearchSuggestionKind;
  label: string;
  detail?: string;
  href: string;
};

export const SUGGESTION_MIN_LENGTH = 2;
export const SUGGESTION_MAX_LENGTH = 80;
export const SUGGESTION_LIMIT = 6;

const BUSINESS_LIMIT = 4;
const REFERENCE_LIMIT = 2;

/**
 * Trims and bounds the typed text. Returns null when it is too short to
 * suggest from, so callers can answer with an empty list without a query.
 */
export function normaliseSuggestionQuery(
  value: string | null | undefined,
): string | null {
  const trimmed = value
    ?.trim()
    .replace(/\s+/g, " ")
    .slice(0, SUGGESTION_MAX_LENGTH);
  return trimmed && trimmed.length >= SUGGESTION_MIN_LENGTH ? trimmed : null;
}

/** Escapes LIKE wildcards so typed text is matched literally. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

type BusinessRow = {
  slug: string;
  trading_name: string;
  category_name: string;
  place_name: string;
};
type CategoryRow = { slug: string; name: string };
type PlaceRow = { slug: string; canonical_name: string };

/**
 * Typo-tolerant suggestions drawn only from the public projection: published,
 * non-suspended businesses with a published site, active categories that have
 * at least one such business, and active places. Never throws; a database
 * failure yields no suggestions so the plain search form keeps working.
 */
export async function listSearchSuggestions(
  rawQuery: string | null | undefined,
): Promise<SearchSuggestion[]> {
  const query = normaliseSuggestionQuery(rawQuery);
  if (!query) return [];
  const pattern = `%${escapeLikePattern(query)}%`;

  try {
    const client = getDatabaseClient();

    const [businesses, categories, places] = await Promise.all([
      client<BusinessRow[]>`
        with search_input as (
          select lower(public.ourvalleys_unaccent(${query}::text)) as query
        )
        select b.slug, b.trading_name, c.name as category_name, p.canonical_name as place_name
        from business b
        cross join search_input s
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
        where b.status = 'published'
          and b.suspended_at is null
          and (
            lower(public.ourvalleys_unaccent(b.trading_name)) like ${pattern} escape '\\'
            or similarity(lower(public.ourvalleys_unaccent(b.trading_name)), s.query) >= 0.3
          )
        order by
          case
            when lower(public.ourvalleys_unaccent(b.trading_name)) like s.query || '%' then 0
            else 1
          end,
          similarity(lower(public.ourvalleys_unaccent(b.trading_name)), s.query) desc,
          b.trading_name asc
        limit ${BUSINESS_LIMIT}
      `,
      client<CategoryRow[]>`
        with search_input as (
          select lower(public.ourvalleys_unaccent(${query}::text)) as query
        )
        select c.slug, c.name
        from category c
        cross join search_input s
        where c.status = 'active'
          and exists (
            select 1
            from business b
            inner join business_publication bp
              on bp.business_id = b.id
              and bp.status = 'published'
              and bp.published_at is not null
            where b.primary_category_id = c.id
              and b.status = 'published'
              and b.suspended_at is null
          )
          and (
            lower(public.ourvalleys_unaccent(c.name)) like ${pattern} escape '\\'
            or similarity(lower(public.ourvalleys_unaccent(c.name)), s.query) >= 0.3
            or exists (
              select 1 from category_alias ca
              where ca.category_id = c.id
                and ca.status = 'active'
                and (
                  lower(public.ourvalleys_unaccent(ca.label)) like ${pattern} escape '\\'
                  or similarity(lower(public.ourvalleys_unaccent(ca.label)), s.query) >= 0.3
                )
            )
          )
        order by
          similarity(lower(public.ourvalleys_unaccent(c.name)), s.query) desc,
          c.name asc
        limit ${REFERENCE_LIMIT}
      `,
      client<PlaceRow[]>`
        with search_input as (
          select lower(public.ourvalleys_unaccent(${query}::text)) as query
        )
        select pl.slug, pl.canonical_name
        from place pl
        cross join search_input s
        where pl.status = 'active'
          and pl.coverage_status in ('active', 'pilot', 'seeding')
          and (
            lower(public.ourvalleys_unaccent(pl.canonical_name)) like ${pattern} escape '\\'
            or similarity(lower(public.ourvalleys_unaccent(pl.canonical_name)), s.query) >= 0.3
          )
        order by
          similarity(lower(public.ourvalleys_unaccent(pl.canonical_name)), s.query) desc,
          pl.canonical_name asc
        limit ${REFERENCE_LIMIT}
      `,
    ]);

    const suggestions: SearchSuggestion[] = [
      ...businesses.map((row) => ({
        kind: "business" as const,
        label: row.trading_name,
        detail: `${row.category_name} · ${row.place_name}`,
        href: `/b/${row.slug}`,
      })),
      ...categories.map((row) => ({
        kind: "category" as const,
        label: row.name,
        detail: "Category",
        href: `/businesses?category=${encodeURIComponent(row.slug)}`,
      })),
      ...places.map((row) => ({
        kind: "place" as const,
        label: row.canonical_name,
        detail: "Place",
        href: `/places/${encodeURIComponent(row.slug)}`,
      })),
    ];
    return suggestions.slice(0, SUGGESTION_LIMIT);
  } catch {
    return [];
  }
}
