import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  buildWelshCoverage,
  type WelshCoverage,
  type WelshCoverageBusinessInput,
} from "./welsh-coverage-model";

interface CoverageRow extends Record<string, unknown> {
  id: string;
  trading_name: string;
  slug: string;
  welsh_name: string | null;
  welsh_summary: string | null;
  welsh_description: string | null;
  updated_at: Date | string;
  services: number | string;
  services_with_welsh: number | string;
  photos: number | string;
  photos_with_welsh_alt: number | string;
}

/**
 * Read-only coverage report over the live, public directory (published, not
 * suspended, not demo). Private business fields are never selected.
 */
export async function getWelshCoverage(): Promise<WelshCoverage> {
  const rows = await getDatabase().execute<CoverageRow>(sql`
    select
      b.id,
      b.trading_name,
      b.slug,
      b.welsh_name,
      bt.summary as welsh_summary,
      bt.description as welsh_description,
      b.updated_at,
      (select count(*) from service s
         where s.business_id = b.id and s.status = 'active') as services,
      (select count(*) from service s
         join service_translation st
           on st.service_id = s.id and st.locale = 'cy'
         where s.business_id = b.id and s.status = 'active'
           and nullif(btrim(coalesce(st.name, '')), '') is not null) as services_with_welsh,
      (select count(*) from business_media m
         where m.business_id = b.id and m.status = 'active') as photos,
      (select count(*) from business_media m
         where m.business_id = b.id and m.status = 'active'
           and nullif(btrim(coalesce(m.alt_text_cy, '')), '') is not null) as photos_with_welsh_alt
    from business b
    left join business_translation bt
      on bt.business_id = b.id and bt.locale = 'cy'
    where b.status = 'published'
      and b.suspended_at is null
      and b.is_demo = false
  `);
  const inputs: WelshCoverageBusinessInput[] = rows.map((row) => ({
    id: row.id,
    tradingName: row.trading_name,
    slug: row.slug,
    welshName: row.welsh_name,
    welshSummary: row.welsh_summary,
    welshDescription: row.welsh_description,
    updatedAt: new Date(row.updated_at),
    services: Number(row.services),
    servicesWithWelsh: Number(row.services_with_welsh),
    photos: Number(row.photos),
    photosWithWelshAlt: Number(row.photos_with_welsh_alt),
  }));
  return buildWelshCoverage(inputs);
}
