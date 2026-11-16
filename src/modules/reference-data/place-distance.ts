import { sql, type AnyColumn, type SQL } from "drizzle-orm";

/**
 * "Within `radiusKm` of a public place" as a SQL condition on a place id
 * column (doc 101-events-near-me). Distances run between public locality
 * centres (`place_coordinate`), never business or resident addresses, exactly
 * as the directory's `near` filter does.
 *
 * An unknown, inactive or coordinate-less origin place disables the filter
 * (it matches everything) rather than emptying the page, so a stale link
 * degrades to the unfiltered list. A place without a stored centre is outside
 * every radius.
 */
export function withinKmOfPlace(
  placeIdColumn: AnyColumn,
  nearSlug: string,
  radiusKm: number,
): SQL {
  return sql`(
    not exists (
      select 1
      from place origin_place
      inner join place_coordinate origin_coordinate
        on origin_coordinate.place_id = origin_place.id
      where origin_place.slug = ${nearSlug} and origin_place.status = 'active'
    )
    or exists (
      select 1
      from place origin_place
      inner join place_coordinate origin_coordinate
        on origin_coordinate.place_id = origin_place.id
      inner join place_coordinate candidate_coordinate
        on candidate_coordinate.place_id = ${placeIdColumn}
      where origin_place.slug = ${nearSlug} and origin_place.status = 'active'
        and 2 * 6371 * asin(least(1, sqrt(
          power(sin(radians(candidate_coordinate.latitude - origin_coordinate.latitude) / 2), 2) +
          cos(radians(origin_coordinate.latitude)) * cos(radians(candidate_coordinate.latitude)) *
          power(sin(radians(candidate_coordinate.longitude - origin_coordinate.longitude) / 2), 2)
        ))) <= ${radiusKm}::double precision
    )
  )`;
}
