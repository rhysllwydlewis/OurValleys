/** Rolling window of enquiries considered. */
export const REPLY_TIME_WINDOW_DAYS = 90;
/** Fewer countable enquiries than this and no label is shown. */
export const REPLY_TIME_MIN_ENQUIRIES = 5;
/** Enquiries younger than this and still unanswered are not counted yet. */
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;
const BANDS = [
  { maxMs: 6 * HOUR_MS, label: "within a few hours" },
  { maxMs: 24 * HOUR_MS, label: "within a day" },
  { maxMs: 3 * 24 * HOUR_MS, label: "within a few days" },
] as const;

export type EnquiryReplySample = {
  status: string;
  submittedAt: Date;
  firstRepliedAt: Date | null;
};

/**
 * Pure band calculation. Replied enquiries count by their first-reply time.
 * Enquiries still `new`/`read` count as unanswered once past a three-day
 * grace period, so a business cannot look quick by ignoring most messages.
 * Rows handled without a recorded reply time (older replies, closed or
 * archived) are unknown and left out. Slow businesses get no public label.
 */
export function replyTimeLabel(
  samples: EnquiryReplySample[],
  now = new Date(),
): string | null {
  const durations: number[] = [];
  for (const sample of samples) {
    if (sample.firstRepliedAt) {
      durations.push(
        Math.max(
          0,
          sample.firstRepliedAt.getTime() - sample.submittedAt.getTime(),
        ),
      );
    } else if (
      (sample.status === "new" || sample.status === "read") &&
      now.getTime() - sample.submittedAt.getTime() >= GRACE_MS
    ) {
      durations.push(Number.POSITIVE_INFINITY);
    }
  }
  if (durations.length < REPLY_TIME_MIN_ENQUIRIES) return null;
  durations.sort((a, b) => a - b);
  const median = durations[Math.floor((durations.length - 1) / 2)]!;
  const band = BANDS.find((candidate) => median <= candidate.maxMs);
  return band ? `Usually replies ${band.label}` : null;
}
