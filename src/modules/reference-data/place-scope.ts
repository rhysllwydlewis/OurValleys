import { sql, type AnyColumn, type SQL } from "drizzle-orm";

/**
 * Restricts a query to a place and everything inside it (a valley includes
 * its towns, a council area its valleys and their towns), so choosing a wider
 * place never hides the businesses, offers and events recorded against the
 * towns within it. `union` (not `union all`) stops a cycle in the hierarchy
 * from recursing forever. `placeIdColumn` must be the joined place's id.
 */
export function placeScopeCondition(
  placeIdColumn: AnyColumn,
  placeSlug: string,
): SQL {
  return sql`${placeIdColumn} in (
    with recursive place_scope(id) as (
      select id from place where slug = ${placeSlug}
      union
      select r.child_place_id
      from place_relationship r
      inner join place cp on cp.id = r.child_place_id and cp.status = 'active'
      inner join place_scope s on s.id = r.parent_place_id
      where r.relationship_type = 'contains'
    )
    select id from place_scope
  )`;
}
