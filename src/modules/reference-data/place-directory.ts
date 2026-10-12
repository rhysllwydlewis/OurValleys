import "server-only";
import { getDatabaseClient } from "@/lib/database/client";
import { buildPlaceTree, type PlaceNode, type PlaceTree } from "./place-tree";

type Row = {
  id: string;
  slug: string;
  name: string;
  welsh_name: string | null;
  place_type: string;
  coverage_status: string;
  parent_id: string | null;
  aliases: string[];
  business_count: number;
};

/**
 * Every active place with its parent, search aliases and the number of
 * published businesses recorded directly against it. Business counts use the
 * same publication and visibility rules as the directory and the map (a
 * published business with a published site, not suspended, primary location
 * active), and no per-business or address data is read at all. Returns null
 * when the database is unavailable so pages can say so instead of showing an
 * empty hierarchy.
 */
export async function loadPlaceTree(): Promise<PlaceTree | null> {
  try {
    const client = getDatabaseClient();
    const rows = await client<Row[]>`
      with visible as (
        select bl.place_id, count(distinct b.id)::int as n
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
        inner join business_location bl
          on bl.business_id = b.id
          and bl.status = 'active'
          and bl.is_primary = true
        inner join category c
          on c.id = b.primary_category_id
          and c.status = 'active'
        where b.status = 'published'
          and b.suspended_at is null
        group by bl.place_id
      )
      select p.id, p.slug, p.canonical_name as name, p.welsh_name,
        p.place_type, p.coverage_status,
        (
          select r.parent_place_id
          from place_relationship r
          inner join place pp on pp.id = r.parent_place_id and pp.status = 'active'
          where r.child_place_id = p.id
            and r.relationship_type = 'contains'
          order by r.sort_order asc, r.parent_place_id asc
          limit 1
        ) as parent_id,
        coalesce(
          (
            select array_agg(distinct a.alias)
            from place_alias a
            where a.place_id = p.id and a.status = 'active'
          ),
          '{}'
        ) as aliases,
        coalesce(v.n, 0)::int as business_count
      from place p
      left join visible v on v.place_id = p.id
      where p.status = 'active'
      order by p.canonical_name asc, p.slug asc
    `;
    const nodes: PlaceNode[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      welshName: row.welsh_name,
      placeType: row.place_type,
      coverageStatus: row.coverage_status,
      parentId: row.parent_id,
      aliases: row.aliases,
      businessCount: Number(row.business_count),
    }));
    return buildPlaceTree(nodes);
  } catch {
    return null;
  }
}
