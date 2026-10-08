export const businessSuggestionStatuses = [
  "new",
  "seeded",
  "already_listed",
  "rejected",
] as const;
export type BusinessSuggestionStatus =
  (typeof businessSuggestionStatuses)[number];

export type NormalisedSuggestionInput = {
  name: string;
  placeText: string;
  categoryText: string | null;
  note: string | null;
  contactEmail: string | null;
  dedupeKey: string;
  /** Honeypot: any value means an automated submission. */
  website: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return undefined;
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? undefined : collapsed;
}

/** Name and place with case, accents and punctuation removed, for grouping. */
export function suggestionDedupeKey(name: string, place: string): string {
  const fold = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${fold(name)}|${fold(place)}`;
}

/** Returns null when the input is malformed or fails a required rule. */
export function normaliseSuggestionInput(
  input: unknown,
): NormalisedSuggestionInput | null {
  if (!isRecord(input)) return null;
  const name = text(input.name, 120);
  const placeText = text(input.placeText, 80);
  const categoryText = text(input.categoryText, 80);
  const email = text(input.contactEmail, 254);
  const website = typeof input.website === "string" ? input.website : "";
  let note: string | undefined;
  if (input.note === undefined || input.note === null) note = "";
  else if (typeof input.note === "string") {
    const trimmed = input.note.trim();
    note = trimmed.length > 500 ? undefined : trimmed;
  }
  if (
    name === undefined ||
    placeText === undefined ||
    categoryText === undefined ||
    email === undefined ||
    note === undefined
  ) {
    return null;
  }
  if (name.length < 2 || placeText.length < 2) return null;
  if (email && !emailPattern.test(email)) return null;
  return {
    name,
    placeText,
    categoryText: categoryText || null,
    note: note || null,
    contactEmail: email ? email.toLowerCase() : null,
    dedupeKey: suggestionDedupeKey(name, placeText),
    website,
  };
}
