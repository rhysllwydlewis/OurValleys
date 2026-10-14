import { sql, type AnyColumn, type SQL } from "drizzle-orm";

/**
 * Restricts a query to every place a resident saved and everything inside
 * those places (a saved valley includes its towns, a council area its valleys
 * and their towns). Shared by the resident home and the weekly digest so the
 * page and the email can never disagree. `union` (not `union all`) stops a
 * cycle in the hierarchy from recursing forever; `userId` is a bound
 * parameter. `placeIdColumn` must be the joined place's id.
 */
export function savedPlaceScopeCondition(
  placeIdColumn: AnyColumn,
  userId: string,
): SQL {
  return sql`${placeIdColumn} in (
    with recursive saved_scope(id) as (
      select p.id from resident_saved_place sp
      inner join place p on p.id = sp.place_id and p.status = 'active'
      where sp.user_id = ${userId}
      union
      select r.child_place_id
      from place_relationship r
      inner join place cp on cp.id = r.child_place_id and cp.status = 'active'
      inner join saved_scope s on s.id = r.parent_place_id
      where r.relationship_type = 'contains'
    )
    select id from saved_scope
  )`;
}
