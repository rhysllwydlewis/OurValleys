/**
 * What an organiser said about cost and access. Nothing is inferred: a null
 * field is "not stated" and produces no label, so a visitor is never told an
 * event is free, paid or step-free on the strength of silence.
 */
export type EventCostFields = {
  isFree?: boolean | null;
  priceNote?: string | null;
  stepFree?: boolean | null;
};

export type EventCostTag =
  | { kind: "free" }
  | { kind: "paid"; note: string | null }
  | { kind: "stepFree" }
  | { kind: "notStepFree" };

/** The tags to show, cost first. Empty when the organiser said nothing. */
export function eventCostTags(event: EventCostFields): EventCostTag[] {
  const tags: EventCostTag[] = [];
  if (event.isFree === true) tags.push({ kind: "free" });
  else if (event.isFree === false) {
    tags.push({ kind: "paid", note: event.priceNote?.trim() || null });
  } else if (event.priceNote?.trim()) {
    // A price note on an event with no free/paid choice still tells visitors something.
    tags.push({ kind: "paid", note: event.priceNote.trim() });
  }
  if (event.stepFree === true) tags.push({ kind: "stepFree" });
  else if (event.stepFree === false) tags.push({ kind: "notStepFree" });
  return tags;
}

/** English wording for feeds and calendar entries, which are not localised. */
export const EVENT_COST_WORDS_EN = {
  free: "Free",
  paid: "Paid",
  stepFree: "Step-free access",
  notStepFree: "Not step-free",
} as const;

/** One plain-text line for feeds and calendar descriptions; null when empty. */
export function eventCostSummary(
  event: EventCostFields,
  words: { free: string; paid: string; stepFree: string; notStepFree: string },
): string | null {
  const parts = eventCostTags(event).map((tag) => {
    switch (tag.kind) {
      case "free":
        return words.free;
      case "paid":
        return tag.note ?? words.paid;
      case "stepFree":
        return words.stepFree;
      case "notStepFree":
        return words.notStepFree;
    }
  });
  return parts.length > 0 ? parts.join(" · ") : null;
}
