import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  categorySeedSchema,
  placeSeedSchema,
  type CategorySeed,
  type PlaceSeed,
} from "./schemas";

async function readJson(relativePath: string): Promise<unknown> {
  const filePath = path.join(process.cwd(), relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

export async function loadPlaceSeed(): Promise<PlaceSeed> {
  return placeSeedSchema.parse(await readJson("data/places/rct.seed.json"));
}

export async function loadCategorySeed(): Promise<CategorySeed> {
  return categorySeedSchema.parse(await readJson("data/categories/business-categories.seed.json"));
}
