import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessMedia } from "@/lib/database/schema/business";
import {
  listCategorySections,
  saveCategorySectionDisplacing,
} from "./content-features";
import {
  releaseContentImageIfUnused,
  saveContentImage,
} from "./content-images";
import {
  maxPicturesPerSection,
  type ExtraEntry,
  type ParsedExtraSectionForm,
} from "./extra-sections-model";

export type SaveSectionWithPicturesOutcome =
  | "saved"
  | "invalid"
  | "not_found"
  | "limit"
  | "unavailable"
  | "picture-invalid"
  | "picture-limit"
  | "picture-storage"
  | "picture-row"
  | "picture-too-many"
  | "picture-multiple";

type Parsed = Extract<ParsedExtraSectionForm, { ok: true }>;

/**
 * Saves a products, treatments or team section together with the pictures its
 * rows carry (docs/79). `files[i]` is the file chosen on form row `i` (null or
 * empty when none). The form's "keep this picture" ids are untrusted: a
 * picture is kept only when this section's saved entries already show it, so a
 * tampered id can never attach another section's or business's media.
 *
 * Order matters for safety: new files are stored first; if the section then
 * fails to save they are released again; pictures the save stops using are
 * released only after it succeeded, and only when nothing else still uses them.
 */
export async function saveSectionWithPictures(input: {
  businessId: string;
  sectionId: string | undefined;
  parsed: Parsed;
  files: ReadonlyArray<File | null | undefined>;
}): Promise<{ outcome: SaveSectionWithPicturesOutcome; row?: number }> {
  const { parsed } = input;
  const kind = parsed.section.sectionType;
  const supportsPictures =
    kind === "products" || kind === "treatments" || kind === "team";

  // One new picture per save keeps the request inside the server-action body
  // limit (a 5MB picture plus text), so a valid pair of pictures can never be
  // rejected as a whole before the action can say which row was the problem.
  if (input.files.filter((file) => file && file.size > 0).length > 1) {
    return { outcome: "picture-multiple" };
  }

  // A file chosen on a row the form skipped (no name) would vanish silently.
  const used = new Set(parsed.rows);
  for (let index = 0; index < input.files.length; index += 1) {
    const file = input.files[index];
    if (file && file.size > 0 && (!used.has(index) || !supportsPictures)) {
      return { outcome: "picture-row", row: index + 1 };
    }
  }

  // What the section shows today, read for this business only.
  let existing = new Map<string, { id: string; altText: string }>();
  if (input.sectionId) {
    const sections = await listCategorySections(input.businessId);
    const current = sections.find((section) => section.id === input.sectionId);
    if (!current) return { outcome: "not_found" };
    existing = new Map(
      current.entries.flatMap((entry) =>
        entry.image ? [[entry.image.id, entry.image] as const] : [],
      ),
    );
  }

  const entries: ExtraEntry[] = parsed.section.entries.map((entry) => ({
    ...entry,
  }));
  const uploaded: string[] = [];
  const altUpdates: Array<{ mediaId: string; altText: string }> = [];
  const keptIds = new Set<string>();

  const discardUploads = async () => {
    for (const mediaId of uploaded) {
      await releaseContentImageIfUnused({
        businessId: input.businessId,
        mediaId,
      });
    }
  };

  for (let position = 0; position < entries.length; position += 1) {
    const entry = entries[position]!;
    const intent = parsed.pictures[position]!;
    const row = parsed.rows[position]! + 1;
    const file = input.files[parsed.rows[position]!];
    if (!supportsPictures) continue;

    if (file && file.size > 0) {
      const saved = await saveContentImage({
        businessId: input.businessId,
        kind: "catalogue",
        contentType: file.type,
        bytes: Buffer.from(await file.arrayBuffer()),
        altText: intent.alt,
        // The old picture is released after the save, not counted away here.
        replacingMediaId: null,
      });
      if (saved.status !== "saved") {
        await discardUploads();
        const outcomes = {
          invalid: "picture-invalid",
          limit: "picture-limit",
          disabled: "picture-storage",
          unavailable: "unavailable",
        } as const;
        return { outcome: outcomes[saved.status], row };
      }
      uploaded.push(saved.mediaId);
      entry.imageMediaId = saved.mediaId;
      continue;
    }
    if (intent.remove) continue;
    if (intent.keep && existing.has(intent.keep) && !keptIds.has(intent.keep)) {
      keptIds.add(intent.keep);
      entry.imageMediaId = intent.keep;
      if (intent.alt.length >= 3) {
        altUpdates.push({ mediaId: intent.keep, altText: intent.alt });
      }
    }
  }

  if (
    entries.filter((entry) => entry.imageMediaId).length > maxPicturesPerSection
  ) {
    await discardUploads();
    return { outcome: "picture-too-many" };
  }

  const { result, previousPictureIds } = await saveCategorySectionDisplacing({
    businessId: input.businessId,
    section: {
      ...(input.sectionId ? { id: input.sectionId } : {}),
      ...parsed.section,
      entries,
    },
  });
  if (result !== "saved") {
    await discardUploads();
    return { outcome: result };
  }

  // The save worked: retire pictures it dropped, and apply new descriptions.
  const nowUsed = new Set(
    entries.flatMap((entry) =>
      entry.imageMediaId ? [entry.imageMediaId] : [],
    ),
  );
  // Taken from the row as it was when this save replaced it, not from the
  // earlier read, so overlapping saves each retire what they displaced.
  for (const mediaId of new Set([...previousPictureIds, ...existing.keys()])) {
    if (!nowUsed.has(mediaId)) {
      await releaseContentImageIfUnused({
        businessId: input.businessId,
        mediaId,
      });
    }
  }
  if (altUpdates.length > 0) {
    try {
      const database = getDatabase();
      for (const update of altUpdates) {
        await database
          .update(businessMedia)
          .set({
            altText: update.altText.slice(0, 300),
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(businessMedia.id, update.mediaId),
              eq(businessMedia.businessId, input.businessId),
              eq(businessMedia.role, "catalogue"),
              inArray(businessMedia.status, ["active"]),
            ),
          );
      }
    } catch {
      // A description that fails to update leaves the old one; the save stands.
    }
  }
  return { outcome: "saved" };
}
