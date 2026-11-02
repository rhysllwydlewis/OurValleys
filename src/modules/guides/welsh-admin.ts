import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { guide, guideTranslation } from "@/lib/database/schema/guides";
import { getGuideForAdmin, type AdminGuide } from "./admin";
import { parseStoredSections } from "./shared";
import {
  alignWelshSections,
  assessWelshGuide,
  emptyWelshGuide,
  parseStoredWelsh,
  welshGuideFieldsSchema,
  type WelshGuideFields,
  type WelshProgress,
} from "./welsh";

const welshOf = (guideId: string) =>
  and(eq(guideTranslation.guideId, guideId), eq(guideTranslation.locale, "cy"));

export type AdminGuideWelsh = {
  guide: AdminGuide;
  /** What is saved, aligned to the English sections (empty fields when none). */
  welsh: WelshGuideFields;
  /** Null when no Welsh has been saved yet. */
  welshUpdatedAt: Date | null;
  /** True when the English changed after the Welsh was last saved. */
  englishChangedSince: boolean;
  progress: WelshProgress;
};

type StoredRow = {
  title: string;
  summary: string;
  areaLabel: string;
  readingTime: string;
  sponsorshipDisclosure: string;
  sections: unknown;
  translatedFrom: Date | null;
  updatedAt: Date;
};

function buildView(
  english: AdminGuide,
  row: StoredRow | undefined,
): AdminGuideWelsh {
  const stored = row ? parseStoredWelsh(row) : emptyWelshGuide();
  const welsh: WelshGuideFields = {
    ...stored,
    sections: alignWelshSections(english.sections, stored.sections),
  };
  return {
    guide: english,
    welsh,
    welshUpdatedAt: row?.updatedAt ?? null,
    englishChangedSince:
      !!row?.translatedFrom &&
      english.updatedAt.getTime() > row.translatedFrom.getTime(),
    progress: assessWelshGuide(english, row ? welsh : null),
  };
}

export async function getGuideWelshForAdmin(
  rawGuideId: unknown,
): Promise<AdminGuideWelsh | null> {
  const english = await getGuideForAdmin(rawGuideId);
  if (!english) return null;
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        title: guideTranslation.title,
        summary: guideTranslation.summary,
        areaLabel: guideTranslation.areaLabel,
        readingTime: guideTranslation.readingTime,
        sponsorshipDisclosure: guideTranslation.sponsorshipDisclosure,
        sections: guideTranslation.sections,
        translatedFrom: guideTranslation.translatedFrom,
        updatedAt: guideTranslation.updatedAt,
      })
      .from(guideTranslation)
      .where(welshOf(english.id))
      .limit(1);
    return buildView(english, row);
  } catch {
    return null;
  }
}

/** Welsh progress for each guide in the studio's list, in one query. */
export async function listWelshProgressForAdmin(
  guides: readonly AdminGuide[],
): Promise<Map<string, WelshProgress>> {
  const progress = new Map<string, WelshProgress>();
  if (guides.length === 0) return progress;
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        guideId: guideTranslation.guideId,
        title: guideTranslation.title,
        summary: guideTranslation.summary,
        areaLabel: guideTranslation.areaLabel,
        readingTime: guideTranslation.readingTime,
        sponsorshipDisclosure: guideTranslation.sponsorshipDisclosure,
        sections: guideTranslation.sections,
      })
      .from(guideTranslation)
      .where(
        inArray(
          guideTranslation.guideId,
          guides.map((item) => item.id),
        ),
      );
    const byGuide = new Map(rows.map((row) => [row.guideId, row]));
    for (const item of guides) {
      const row = byGuide.get(item.id);
      progress.set(
        item.id,
        assessWelshGuide(item, row ? parseStoredWelsh(row) : null),
      );
    }
  } catch {
    // The list still works without the badges.
  }
  return progress;
}

const saveInputSchema = z.object({
  guideId: z.uuid(),
  /** The `updatedAt` the editor loaded for the Welsh row; null when none existed. */
  expectedUpdatedAt: z.iso.datetime().nullable(),
  /** The English guide's `updatedAt` the editor was showing. */
  englishUpdatedAt: z.iso.datetime(),
  fields: welshGuideFieldsSchema,
});

export type SaveGuideWelshResult =
  | { status: "saved"; updatedAt: string; progress: WelshProgress }
  | { status: "not_found" }
  | { status: "conflict" }
  | { status: "english_changed" }
  | { status: "invalid"; issues: string[] }
  | { status: "unavailable" };

function describeIssues(issues: readonly z.core.$ZodIssue[]): string[] {
  const seen = new Set<string>();
  for (const issue of issues) {
    const path = issue.path.filter((part) => typeof part === "string");
    const field = String(path[path.length - 1] ?? "field");
    seen.add(`The Welsh ${field} is too long.`);
  }
  return [...seen];
}

/**
 * Saves the Welsh version. Sections are matched to the English by id and any
 * Welsh for a removed section is dropped. The save is refused when the Welsh
 * changed under the editor (conflict) or when the English changed since the
 * editor loaded, because the pairing the admin saw may no longer hold.
 */
export async function saveGuideWelshForAdmin(
  rawInput: unknown,
): Promise<SaveGuideWelshResult> {
  const parsed = saveInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", issues: describeIssues(parsed.error.issues) };
  }
  const { guideId, expectedUpdatedAt, englishUpdatedAt, fields } = parsed.data;

  try {
    const database = getDatabase();
    return await database.transaction(async (tx) => {
      // Lock the English row so a concurrent English edit cannot slip between
      // the check below and the write.
      const [english] = await tx
        .select()
        .from(guide)
        .where(eq(guide.id, guideId))
        .for("share")
        .limit(1);
      if (!english) return { status: "not_found" } as const;
      if (
        english.updatedAt.getTime() !== new Date(englishUpdatedAt).getTime()
      ) {
        return { status: "english_changed" } as const;
      }
      const view = parseStoredSections(english.sections);
      const sections = alignWelshSections(view, fields.sections);
      const values = { ...fields, sections };
      const now = new Date();

      if (expectedUpdatedAt === null) {
        const inserted = await tx
          .insert(guideTranslation)
          .values({
            guideId,
            locale: "cy",
            ...values,
            translatedFrom: english.updatedAt,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing()
          .returning({ id: guideTranslation.id });
        if (inserted.length === 0) return { status: "conflict" } as const;
      } else {
        const updated = await tx
          .update(guideTranslation)
          .set({ ...values, translatedFrom: english.updatedAt, updatedAt: now })
          .where(
            and(
              welshOf(guideId),
              sql`date_trunc('milliseconds', ${guideTranslation.updatedAt}) = ${expectedUpdatedAt}::timestamptz`,
            ),
          )
          .returning({ id: guideTranslation.id });
        if (updated.length === 0) return { status: "conflict" } as const;
      }

      return {
        status: "saved",
        updatedAt: now.toISOString(),
        progress: assessWelshGuide(
          {
            title: english.title,
            summary: english.summary,
            areaLabel: english.areaLabel,
            readingTime: english.readingTime,
            sponsorshipDisclosure: english.sponsorshipDisclosure,
            sections: view,
          },
          values,
        ),
      } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}

export type DeleteGuideWelshResult =
  "deleted" | "not_found" | "invalid" | "unavailable";

/** Removes the Welsh version; Welsh readers then see the English guide. */
export async function deleteGuideWelshForAdmin(
  rawGuideId: unknown,
): Promise<DeleteGuideWelshResult> {
  const parsed = z.uuid().safeParse(rawGuideId);
  if (!parsed.success) return "invalid";
  try {
    const database = getDatabase();
    const removed = await database
      .delete(guideTranslation)
      .where(welshOf(parsed.data))
      .returning({ id: guideTranslation.id });
    return removed.length > 0 ? "deleted" : "not_found";
  } catch {
    return "unavailable";
  }
}
