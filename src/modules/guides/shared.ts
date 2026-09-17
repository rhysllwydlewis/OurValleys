import { z } from "zod";

export const guideSectionSchema = z.object({
  heading: z.string().trim().min(2).max(120),
  body: z.string().trim().min(10).max(1000),
  href: z.string().trim().min(1).max(300).startsWith("/"),
  linkLabel: z.string().trim().min(2).max(100),
});

export const guideSectionsSchema = z.array(guideSectionSchema).min(1).max(8);

export type GuideSection = z.infer<typeof guideSectionSchema>;

export type GuideStatus = "draft" | "published" | "archived";

/** Sections are stored as jsonb; re-validate on the way out in case the column ever holds a stale shape. */
export function parseStoredSections(value: unknown): GuideSection[] {
  const result = guideSectionsSchema.safeParse(value);
  return result.success ? result.data : [];
}
