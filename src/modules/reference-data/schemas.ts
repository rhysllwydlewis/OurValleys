import { z } from "zod";

const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.enum(["verified", "provisional"]),
});

export const placeSeedSchema = z.object({
  version: z.number().int().positive(),
  reviewedAt: z.iso.date(),
  notes: z.array(z.string()),
  places: z.array(z.object({
    id: z.uuid(),
    parentSlug: z.string().nullable(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    nameEn: z.string().min(1),
    nameCy: z.string().min(1).nullable(),
    type: z.enum(["region", "valley", "town", "village", "neighbourhood"]),
    coverage: z.enum(["planned", "seeding", "active", "retired"]),
    aliases: z.array(z.string()),
    coordinate: coordinateSchema.nullable(),
    source: z.string().min(1),
    sortOrder: z.number().int().nonnegative(),
  })),
});

export const categorySeedSchema = z.object({
  version: z.number().int().positive(),
  reviewedAt: z.iso.date(),
  notes: z.array(z.string()),
  categories: z.array(z.object({
    id: z.uuid(),
    parentSlug: z.string().nullable(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    nameEn: z.string().min(1),
    nameCy: z.string().min(1).nullable(),
    description: z.string().min(1),
    synonyms: z.array(z.string()),
    sortOrder: z.number().int().nonnegative(),
  })),
});

export type PlaceSeed = z.infer<typeof placeSeedSchema>;
export type CategorySeed = z.infer<typeof categorySeedSchema>;
