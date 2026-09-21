import { and, eq, inArray, sql } from "drizzle-orm";
import { businessCategories } from "../src/data/reference/business-categories";
import { rctPlaces } from "../src/data/reference/rct-places";
import { validateReferenceData } from "../src/data/reference/validate-reference-data";
import { closeDatabase, getDatabase } from "../src/lib/database/client";
import { category, place } from "../src/lib/database/schema/business";
import {
  categoryAlias,
  categoryRelationship,
  placeAlias,
  placeCoordinate,
  placeRelationship,
} from "../src/lib/database/schema/reference";

export async function importReferenceData(): Promise<void> {
  const summary = validateReferenceData(rctPlaces, businessCategories);
  const database = getDatabase();
  const placeIds = new Map<string, string>();
  const categoryIds = new Map<string, string>();

  await database.transaction(async (transaction) => {
    for (const record of rctPlaces) {
      const [saved] = await transaction
        .insert(place)
        .values({
          canonicalName: record.canonicalName,
          welshName: record.welshName,
          slug: record.slug,
          placeType: record.placeType,
          coverageStatus: record.coverageStatus,
          editorialSummary: record.editorialSummary,
          status: "active",
        })
        .onConflictDoUpdate({
          target: place.slug,
          set: {
            canonicalName: record.canonicalName,
            welshName: record.welshName,
            placeType: record.placeType,
            coverageStatus: record.coverageStatus,
            editorialSummary: record.editorialSummary,
            status: "active",
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: place.id, slug: place.slug });

      if (!saved) throw new Error(`Place import failed for ${record.slug}.`);
      placeIds.set(saved.slug, saved.id);

      await transaction
        .delete(placeAlias)
        .where(
          and(
            eq(placeAlias.placeId, saved.id),
            eq(placeAlias.aliasType, "search"),
          ),
        );

      for (const alias of record.aliases) {
        await transaction
          .insert(placeAlias)
          .values({
            placeId: saved.id,
            alias: alias.label,
            language: alias.language,
            aliasType: "search",
            status: "active",
          })
          .onConflictDoUpdate({
            target: [placeAlias.placeId, placeAlias.alias, placeAlias.language],
            set: {
              aliasType: "search",
              status: "active",
              updatedAt: sql`now()`,
            },
          });
      }

      if (record.latitude !== null && record.longitude !== null) {
        await transaction
          .insert(placeCoordinate)
          .values({
            placeId: saved.id,
            latitude: record.latitude,
            longitude: record.longitude,
            source: "versioned_reference_data",
          })
          .onConflictDoUpdate({
            target: placeCoordinate.placeId,
            set: {
              latitude: record.latitude,
              longitude: record.longitude,
              source: "versioned_reference_data",
              updatedAt: sql`now()`,
            },
          });
      } else {
        await transaction
          .delete(placeCoordinate)
          .where(
            and(
              eq(placeCoordinate.placeId, saved.id),
              eq(placeCoordinate.source, "versioned_reference_data"),
            ),
          );
      }
    }

    for (const record of rctPlaces) {
      const childPlaceId = placeIds.get(record.slug);
      if (!childPlaceId) {
        throw new Error(`Missing place relationship ID for ${record.slug}.`);
      }

      await transaction
        .delete(placeRelationship)
        .where(
          and(
            eq(placeRelationship.childPlaceId, childPlaceId),
            eq(placeRelationship.relationshipType, "contains"),
          ),
        );

      if (!record.parentSlug) continue;
      const parentPlaceId = placeIds.get(record.parentSlug);
      if (!parentPlaceId) {
        throw new Error(`Missing parent place ID for ${record.slug}.`);
      }
      await transaction.insert(placeRelationship).values({
        parentPlaceId,
        childPlaceId,
        relationshipType: "contains",
      });
    }

    for (const record of businessCategories) {
      const [saved] = await transaction
        .insert(category)
        .values({
          name: record.name,
          welshLabel: record.welshName,
          slug: record.slug,
          description: record.description,
          sortOrder: record.sortOrder,
          status: "active",
        })
        .onConflictDoUpdate({
          target: category.slug,
          set: {
            name: record.name,
            welshLabel: record.welshName,
            description: record.description,
            sortOrder: record.sortOrder,
            status: "active",
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: category.id, slug: category.slug });

      if (!saved) throw new Error(`Category import failed for ${record.slug}.`);
      categoryIds.set(saved.slug, saved.id);

      await transaction
        .delete(categoryAlias)
        .where(
          and(
            eq(categoryAlias.categoryId, saved.id),
            inArray(categoryAlias.aliasType, ["search", "translation"]),
          ),
        );

      const aliases = [
        ...record.aliases,
        { label: record.welshName, language: "cy" as const },
      ];
      for (const alias of aliases) {
        await transaction
          .insert(categoryAlias)
          .values({
            categoryId: saved.id,
            label: alias.label,
            language: alias.language,
            aliasType: alias.language === "cy" ? "translation" : "search",
            status: "active",
          })
          .onConflictDoUpdate({
            target: [
              categoryAlias.categoryId,
              categoryAlias.label,
              categoryAlias.language,
            ],
            set: {
              aliasType: alias.language === "cy" ? "translation" : "search",
              status: "active",
              updatedAt: sql`now()`,
            },
          });
      }
    }

    for (const record of businessCategories) {
      const childCategoryId = categoryIds.get(record.slug);
      if (!childCategoryId) {
        throw new Error(`Missing category relationship ID for ${record.slug}.`);
      }

      await transaction
        .delete(categoryRelationship)
        .where(eq(categoryRelationship.childCategoryId, childCategoryId));

      if (!record.parentSlug) continue;
      const parentCategoryId = categoryIds.get(record.parentSlug);
      if (!parentCategoryId) {
        throw new Error(`Missing parent category ID for ${record.slug}.`);
      }
      await transaction.insert(categoryRelationship).values({
        parentCategoryId,
        childCategoryId,
        sortOrder: record.sortOrder,
      });
    }
  });

  console.info(JSON.stringify({ referenceData: "imported", ...summary }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importReferenceData()
    .catch((error: unknown) => {
      console.error("Reference data import failed.");
      console.error(error instanceof Error ? error.message : "Unknown error.");
      process.exitCode = 1;
    })
    .finally(async () => closeDatabase(1));
}
