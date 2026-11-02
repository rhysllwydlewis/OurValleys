import { z } from "zod";

export const GUIDE_SECTION_LIMIT = 12;
export const guideSectionKinds = ["text", "tip"] as const;
export type GuideSectionKind = (typeof guideSectionKinds)[number];

/**
 * A link inside a guide must stay on this site: a path that starts with a
 * single slash. A protocol-relative `//host` or a backslash would send readers
 * to another site from a link that looks like ours.
 */
export function isInternalGuidePath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\s\u0000-\u001f]/.test(value)
  );
}

export const guideSectionSchema = z
  .object({
    /** Stable across edits and reordering; assigned when a section is created. */
    id: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{1,24}$/)
      .optional(),
    kind: z.enum(guideSectionKinds).default("text"),
    heading: z.string().trim().min(2).max(120),
    body: z.string().trim().min(10).max(2000),
    href: z.string().trim().max(300).default(""),
    linkLabel: z.string().trim().max(100).default(""),
  })
  .superRefine((section, context) => {
    if (section.href && !isInternalGuidePath(section.href)) {
      context.addIssue({
        code: "custom",
        path: ["href"],
        message: "link_path",
      });
    }
    if (section.href && section.linkLabel.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["linkLabel"],
        message: "link_label",
      });
    }
    if (!section.href && section.linkLabel) {
      context.addIssue({
        code: "custom",
        path: ["href"],
        message: "link_path_missing",
      });
    }
  });

export type GuideSectionInput = z.input<typeof guideSectionSchema>;
export type GuideSection = Omit<z.infer<typeof guideSectionSchema>, "id"> & {
  id: string;
};

export const guideSectionsSchema = z
  .array(guideSectionSchema)
  .min(1)
  .max(GUIDE_SECTION_LIMIT)
  .transform(withSectionIds);

export type GuideStatus = "draft" | "published" | "archived";

/**
 * Sections written before ids existed get `s1`, `s2`… by position, and any
 * repeated or missing id is replaced, so every section on record has a unique
 * id the editor can key on. Saving the guide persists them.
 */
export function withSectionIds(
  sections: readonly z.infer<typeof guideSectionSchema>[],
): GuideSection[] {
  const used = new Set<string>();
  return sections.map((section, index) => {
    let id = section.id && !used.has(section.id) ? section.id : `s${index + 1}`;
    let attempt = index + 1;
    while (used.has(id)) {
      attempt += 1;
      id = `s${attempt}`;
    }
    used.add(id);
    return { ...section, id };
  });
}

/**
 * A stored link that no longer passes `isInternalGuidePath` (for example a
 * `//host` saved before that rule existed) loses only its link, not the whole
 * guide's sections.
 */
function dropUnsafeStoredLinks(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((entry) => {
    if (typeof entry !== "object" || entry === null) return entry;
    const href = (entry as { href?: unknown }).href;
    if (typeof href !== "string" || !href.trim()) return entry;
    return isInternalGuidePath(href.trim())
      ? entry
      : { ...entry, href: "", linkLabel: "" };
  });
}

/** Sections are stored as jsonb; re-validate on the way out in case the column ever holds a stale shape. */
export function parseStoredSections(value: unknown): GuideSection[] {
  const result = guideSectionsSchema.safeParse(dropUnsafeStoredLinks(value));
  return result.success ? result.data : [];
}
