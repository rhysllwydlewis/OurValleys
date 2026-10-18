import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business, category, place } from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import { findAvailableSlug } from "./creation";
import { planImport, type ImportRowError } from "./csv-import";

export type CsvImportResult =
  | {
      status: "checked" | "imported";
      created: number;
      skipped: ImportRowError[];
      errors: ImportRowError[];
    }
  | { status: "unavailable" };

/**
 * Validates the CSV and, unless `dryRun`, creates one unclaimed draft business
 * per valid row for an admin to review and publish. Rows that match an
 * existing business of the same name in the same place are skipped, so
 * importing the same file twice is harmless. Nothing is published.
 */
export async function importBusinessDrafts(input: {
  csv: string;
  adminUserId: string;
  dryRun: boolean;
}): Promise<CsvImportResult & { createdIds?: string[] }> {
  try {
    const database = getDatabase();
    const [categories, places] = await Promise.all([
      database
        .select({ id: category.id, slug: category.slug })
        .from(category)
        .where(eq(category.status, "active")),
      database
        .select({ id: place.id, slug: place.slug })
        .from(place)
        .where(eq(place.status, "active")),
    ]);
    const plan = planImport(input.csv, {
      categoriesBySlug: new Map(categories.map((row) => [row.slug, row.id])),
      placesBySlug: new Map(places.map((row) => [row.slug, row.id])),
    });

    const skipped: ImportRowError[] = [];
    const createdIds: string[] = [];
    let created = 0;

    for (const row of plan.rows) {
      const [existing] = await database
        .select({ id: business.id })
        .from(business)
        .where(
          and(
            ne(business.status, "removed"),
            sql`lower(${business.tradingName}) = lower(${row.tradingName})`,
            sql`(exists (
              select 1 from business_location
              where business_location.business_id = ${business.id}
                and business_location.place_id = ${row.placeId}::uuid
            ) or (not exists (
              select 1 from business_location
              where business_location.business_id = ${business.id}
            ) and exists (
              select 1 from business_onboarding_draft d
              where d.business_id = ${business.id}
                and d.location->>'placeId' = ${row.placeId}
            )))`,
          ),
        )
        .limit(1);
      if (existing) {
        skipped.push({
          line: row.line,
          message: `"${row.tradingName}" already exists in this place.`,
        });
        continue;
      }
      if (input.dryRun) {
        created += 1;
        continue;
      }

      const slug = await findAvailableSlug(row.tradingName, row.placeSlug);
      if (!slug) {
        plan.errors.push({
          line: row.line,
          message: `No web address could be made for "${row.tradingName}".`,
        });
        continue;
      }
      const id = await database.transaction(async (transaction) => {
        const [inserted] = await transaction
          .insert(business)
          .values({
            tradingName: row.tradingName,
            welshName: row.welshName,
            slug,
            summary: "",
            description: "",
            primaryCategoryId: row.categoryId,
            businessType: row.businessType,
            status: "draft",
            claimStatus: "unclaimed",
            createdByUserId: input.adminUserId,
          })
          .returning({ id: business.id });
        if (!inserted) throw new Error("Business insert returned no row.");
        await transaction.insert(businessOnboardingDraft).values({
          businessId: inserted.id,
          location: {
            placeId: row.placeId,
            locationType: row.businessType,
            publicAddressVisibility: "service_area_only",
            publicAddressLineOne: null,
            publicLocality: null,
            publicPostcode: null,
            privateAddressLineOne: null,
            privatePostcode: null,
          },
        });
        return inserted.id;
      });
      createdIds.push(id);
      created += 1;
    }

    return {
      status: input.dryRun ? "checked" : "imported",
      created,
      skipped,
      errors: plan.errors,
      createdIds,
    };
  } catch {
    return { status: "unavailable" };
  }
}
