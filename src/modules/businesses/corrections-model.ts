/**
 * Pure rules behind public corrections that reach the business owner.
 *
 * A visitor's suggestion never changes the website by itself. Ordinary ones
 * (a new phone number, new hours, a closed or moved shop) go to the owner to
 * apply, decline or hand to an admin; disputed or inappropriate ones go
 * straight to the admin ticket desk. Nothing here reads the database or
 * decides who may act.
 */

export const suggestionLimits = {
  hours: 500,
  address: 300,
} as const;

export type SuggestionNotes = {
  /** Free-text opening hours the visitor believes are right. Never applied. */
  hours?: string;
  /** Free-text address or "moved to" note. Never applied. */
  address?: string;
};

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const collapsed = value.replace(/\s+/g, " ").trim().slice(0, max);
  return collapsed.length > 0 ? collapsed : undefined;
}

/** Keeps only the known free-text notes, trimmed and length-limited. */
export function parseSuggestionNotes(raw: unknown): SuggestionNotes {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const notes: SuggestionNotes = {};
  const hours = clean(record.hours, suggestionLimits.hours);
  const address = clean(record.address, suggestionLimits.address);
  if (hours) notes.hours = hours;
  if (address) notes.address = address;
  return notes;
}

export const ownerCorrectionDecisions = [
  "apply",
  "handled",
  "decline",
  "escalate",
] as const;
export type OwnerCorrectionDecision = (typeof ownerCorrectionDecisions)[number];

export function isOwnerCorrectionDecision(
  value: unknown,
): value is OwnerCorrectionDecision {
  return (
    typeof value === "string" &&
    (ownerCorrectionDecisions as readonly string[]).includes(value)
  );
}

/** The suggestion reasons a visitor can pick, in the order the form lists them. */
export const correctionReasons = [
  "incorrect_details",
  "closed_or_moved",
  "inappropriate_content",
  "duplicate_listing",
  "other",
] as const;

/**
 * Whether a report of this reason is handled by the business owner. Reports
 * about inappropriate content or a possible duplicate involve other people's
 * records or safety, so only an admin sees them.
 */
export function routesToOwner(reason: string | null | undefined): boolean {
  return (
    reason === "incorrect_details" ||
    reason === "closed_or_moved" ||
    reason === "other"
  );
}

export type CorrectionChanges = {
  publicPhone?: string | null;
  publicEmail?: string | null;
  summary?: string;
  description?: string;
};

export type CorrectionFieldKey =
  "publicPhone" | "publicEmail" | "summary" | "description";

export const correctionFieldOrder: readonly CorrectionFieldKey[] = [
  "publicPhone",
  "publicEmail",
  "summary",
  "description",
];

/** The first fields to show, whether or not each differs from today's value. */
export function changedFields(
  changes: CorrectionChanges,
  current: Partial<Record<CorrectionFieldKey, string | null>>,
): Array<{
  key: CorrectionFieldKey;
  current: string | null;
  proposed: string | null;
  differs: boolean;
}> {
  return correctionFieldOrder
    .filter((key) => key in changes)
    .map((key) => {
      const proposed = changes[key] ?? null;
      const now = current[key] ?? null;
      return { key, current: now, proposed, differs: proposed !== now };
    });
}

/**
 * What an owner can do with a suggestion that is still theirs to decide.
 * "Apply" needs something concrete to apply; "handled" is for suggestions that
 * are only notes (hours, address) or that the owner has already acted on. Once
 * handed to an admin the owner has no actions: one person decides at a time.
 */
export function ownerCorrectionActions(input: {
  hasChanges: boolean;
}): OwnerCorrectionDecision[] {
  return input.hasChanges
    ? ["apply", "handled", "decline", "escalate"]
    : ["handled", "decline", "escalate"];
}

export const OWNER_CORRECTION_NOTE_MAX = 500;
