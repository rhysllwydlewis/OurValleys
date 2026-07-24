import type { CategorySeed } from "./business-categories";
import type { PlaceSeed } from "./rct-places";

export type ReferenceValidationResult = {
  places: number;
  categories: number;
  aliases: number;
  relationships: number;
};

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.trim().toLocaleLowerCase("en-GB");
    if (!key) throw new Error(`${label} cannot be blank.`);
    if (seen.has(key)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(key);
  }
}

function assertParentsExist<
  T extends { slug: string; parentSlug: string | null },
>(records: readonly T[], label: string): void {
  const slugs = new Set(records.map((record) => record.slug));
  for (const record of records) {
    if (record.parentSlug && !slugs.has(record.parentSlug)) {
      throw new Error(
        `${label} ${record.slug} references missing parent ${record.parentSlug}.`,
      );
    }
  }
}

function assertAcyclic<T extends { slug: string; parentSlug: string | null }>(
  records: readonly T[],
  label: string,
): void {
  const parents = new Map(
    records.map((record) => [record.slug, record.parentSlug]),
  );
  for (const record of records) {
    const visited = new Set<string>([record.slug]);
    let current = record.parentSlug;
    while (current) {
      if (visited.has(current)) {
        throw new Error(`${label} hierarchy contains a cycle at ${current}.`);
      }
      visited.add(current);
      current = parents.get(current) ?? null;
    }
  }
}

function assertCoordinate(
  value: number | null,
  min: number,
  max: number,
  label: string,
) {
  if (
    value !== null &&
    (!Number.isFinite(value) || value < min || value > max)
  ) {
    throw new Error(`${label} is outside the accepted coordinate range.`);
  }
}

export function validateReferenceData(
  places: readonly PlaceSeed[],
  categories: readonly CategorySeed[],
): ReferenceValidationResult {
  assertUnique(
    places.map((record) => record.slug),
    "place slug",
  );
  assertUnique(
    categories.map((record) => record.slug),
    "category slug",
  );
  assertParentsExist(places, "Place");
  assertParentsExist(categories, "Category");
  assertAcyclic(places, "Place");
  assertAcyclic(categories, "Category");

  for (const record of places) {
    assertCoordinate(record.latitude, -90, 90, `${record.slug} latitude`);
    assertCoordinate(record.longitude, -180, 180, `${record.slug} longitude`);
    assertUnique(
      record.aliases.map((alias) => `${alias.language}:${alias.label}`),
      `${record.slug} alias`,
    );
  }

  for (const record of categories) {
    assertUnique(
      record.aliases.map((alias) => `${alias.language}:${alias.label}`),
      `${record.slug} alias`,
    );
  }

  const aliases =
    places.reduce((total, record) => total + record.aliases.length, 0) +
    categories.reduce((total, record) => total + record.aliases.length, 0);
  const relationships =
    places.filter((record) => record.parentSlug).length +
    categories.filter((record) => record.parentSlug).length;

  return {
    places: places.length,
    categories: categories.length,
    aliases,
    relationships,
  };
}
