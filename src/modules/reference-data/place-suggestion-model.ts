import { z } from "zod";
import {
  PLACE_FACTS_MAX,
  PLACE_FACT_LABEL_MAX,
  PLACE_FACT_VALUE_MAX,
  type PlaceFact,
} from "./place-profile-model";

/**
 * Pure model for resident place suggestions (doc 97): validation, the rules
 * for turning an accepted fact into a profile fact, and display labels. No
 * database or framework access.
 */

export const placeSuggestionKinds = [
  "fact",
  "correction",
  "welsh",
  "other",
] as const;
export type PlaceSuggestionKind = (typeof placeSuggestionKinds)[number];

export const placeSuggestionStatuses = ["new", "applied", "dismissed"] as const;
export type PlaceSuggestionStatus = (typeof placeSuggestionStatuses)[number];

export const PLACE_SUGGESTION_MESSAGE_MAX = 500;
export const PLACE_SUGGESTION_MESSAGE_MIN = 3;

export const placeSuggestionKindLabels: Record<PlaceSuggestionKind, string> = {
  fact: "New fact",
  correction: "Correction",
  welsh: "Welsh wording",
  other: "Other",
};

/** Collapses whitespace runs, keeping the text a single tidy line. */
function tidy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export type NormalisedPlaceSuggestion = {
  placeSlug: string;
  kind: PlaceSuggestionKind;
  factLabel: string | null;
  message: string;
  /** Honeypot: any value means an automated submission. */
  website: string;
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

/**
 * Returns null when the input is malformed. A "fact" needs a heading and a
 * value that will fit a profile fact; other kinds take free text up to 500
 * characters. Line breaks inside a message are kept (paragraphs are fine) but
 * runs of blank lines are collapsed.
 */
export function normalisePlaceSuggestion(
  input: unknown,
): NormalisedPlaceSuggestion | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }
  const raw = input as Record<string, unknown>;
  const slug = typeof raw.placeSlug === "string" ? raw.placeSlug.trim() : "";
  if (!SLUG.test(slug)) return null;
  const kind = raw.kind;
  if (!(placeSuggestionKinds as readonly unknown[]).includes(kind)) return null;
  if (raw.message !== undefined && typeof raw.message !== "string") return null;
  if (raw.factLabel !== undefined && typeof raw.factLabel !== "string") {
    return null;
  }
  const website = typeof raw.website === "string" ? raw.website : "";
  const isFact = kind === "fact";
  const message = isFact
    ? tidy(String(raw.message ?? ""))
    : String(raw.message ?? "")
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
  const label = tidy(String(raw.factLabel ?? ""));
  const messageMax = isFact
    ? PLACE_FACT_VALUE_MAX
    : PLACE_SUGGESTION_MESSAGE_MAX;
  if (
    message.length < PLACE_SUGGESTION_MESSAGE_MIN ||
    message.length > messageMax
  ) {
    return null;
  }
  if (isFact && (label.length < 1 || label.length > PLACE_FACT_LABEL_MAX)) {
    return null;
  }
  return {
    placeSlug: slug,
    kind: kind as PlaceSuggestionKind,
    factLabel: isFact ? label : null,
    message,
    website,
  };
}

export const resolveSuggestionSchema = z.object({
  suggestionId: z.uuid(),
  outcome: z.enum(["applied", "dismissed"]),
  /** Apply an accepted fact to the place profile as well. */
  addAsFact: z.boolean().default(false),
});

export type ApplyFactDecision =
  | { ok: true; facts: PlaceFact[] }
  | { ok: false; reason: "full" | "duplicate" | "not_a_fact" };

/**
 * Appends a suggested fact to a profile's facts. Refuses when the profile
 * already holds the maximum, or already has a fact with the same heading
 * (an admin should edit that one instead).
 */
export function applySuggestedFact(
  existing: readonly PlaceFact[],
  suggestion: {
    kind: PlaceSuggestionKind;
    factLabel: string | null;
    message: string;
  },
): ApplyFactDecision {
  if (suggestion.kind !== "fact" || !suggestion.factLabel) {
    return { ok: false, reason: "not_a_fact" };
  }
  if (existing.length >= PLACE_FACTS_MAX) return { ok: false, reason: "full" };
  const key = suggestion.factLabel.toLowerCase();
  if (existing.some((fact) => fact.label.toLowerCase() === key)) {
    return { ok: false, reason: "duplicate" };
  }
  return {
    ok: true,
    facts: [
      ...existing,
      {
        label: suggestion.factLabel,
        labelCy: "",
        value: suggestion.message,
        valueCy: "",
      },
    ],
  };
}

export function clipSuggestion(text: string, length: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
}
