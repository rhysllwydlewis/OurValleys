import { eq } from "drizzle-orm";
import { db, databaseClient } from "../src/lib/database/client";
import { categories, places } from "../src/lib/database/schema";
import { loadCategorySeed, loadPlaceSeed } from "../src/modules/reference-data/loader";

function point(longitude: number, latitude: number): string {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

async function seedPlaces() {
  const seed = await loadPlaceSeed();
  const idsBySlug = new Map(seed.places.map((place) => [place.slug, place.id]));
  for (const place of seed.places) {
    const values = {
      id: place.id,
      parentId: place.parentSlug ? idsBySlug.get(place.parentSlug) : null,
      slug: place.slug,
      nameEn: place.nameEn,
      nameCy: place.nameCy,
      type: place.type,
      coverage: place.coverage,
      aliases: place.aliases,
      coordinate: place.coordinate ? point(place.coordinate.longitude, place.coordinate.latitude) : null,
      source: place.source,
      sortOrder: place.sortOrder,
    };
    await db.insert(places).values(values).onConflictDoUpdate({
      target: places.slug,
      set: { ...values, id: undefined, updatedAt: new Date() },
    });
  }
  return seed.places.length;
}

async function seedCategories() {
  const seed = await loadCategorySeed();
  const idsBySlug = new Map(seed.categories.map((category) => [category.slug, category.id]));
  for (const category of seed.categories) {
    await db.insert(categories).values({
      id: category.id,
      parentId: category.parentSlug ? idsBySlug.get(category.parentSlug) : null,
      slug: category.slug,
      nameEn: category.nameEn,
      nameCy: category.nameCy,
      description: category.description,
      synonyms: category.synonyms,
      sortOrder: category.sortOrder,
    }).onConflictDoUpdate({
      target: categories.slug,
      set: {
        parentId: category.parentSlug ? idsBySlug.get(category.parentSlug) : null,
        nameEn: category.nameEn,
        nameCy: category.nameCy,
        description: category.description,
        synonyms: category.synonyms,
        sortOrder: category.sortOrder,
        retiredAt: null,
        updatedAt: new Date(),
      },
    });
  }
  return seed.categories.length;
}

async function seedDemoBusiness() {
  if (process.env.SEED_DEMO_CONTENT !== "true") return false;
  const { businesses, businessServices } = await import("../src/lib/database/schema/businesses");
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, "plumbers-heating")).limit(1);
  const [place] = await db.select({ id: places.id }).from(places).where(eq(places.slug, "treorchy")).limit(1);
  if (!category || !place) throw new Error("Reference data must exist before demo content is seeded.");

  const demoId = "939292de-74f1-5d20-ab09-82d80e5b68ab";
  await db.insert(businesses).values({
    id: demoId,
    slug: "ourvalleys-demo-plumbing",
    tradingName: "OurValleys Demo Plumbing",
    summary: "A fictional profile used to prove the generated business website journey.",
    description: "This is demo content, not a real trader. It demonstrates how one structured business record powers both directory discovery and a generated public website.",
    status: "published",
    locationType: "service_area",
    primaryCategoryId: category.id,
    placeId: place.id,
    publicEmail: "demo@example.invalid",
    serviceRadiusKm: "15",
    languages: ["English", "Welsh available by arrangement"],
    accessibility: ["Contact by email"],
    publishedAt: new Date(),
  }).onConflictDoUpdate({
    target: businesses.slug,
    set: { primaryCategoryId: category.id, placeId: place.id, updatedAt: new Date() },
  });

  await db.delete(businessServices).where(eq(businessServices.businessId, demoId));
  await db.insert(businessServices).values([
    { businessId: demoId, name: "General plumbing", description: "Fictional demonstration service.", priceLabel: "Quote required", sortOrder: 10 },
    { businessId: demoId, name: "Heating diagnostics", description: "Fictional demonstration service.", priceLabel: "From £75", sortOrder: 20 },
  ]);
  return true;
}

async function main() {
  const placeCount = await seedPlaces();
  const categoryCount = await seedCategories();
  const demoSeeded = await seedDemoBusiness();
  console.info(JSON.stringify({ event: "seed_complete", placeCount, categoryCount, demoSeeded }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await databaseClient.end({ timeout: 5 });
});
