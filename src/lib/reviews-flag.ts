/**
 * Resident reviews are deferred until their release gates are met (AGENTS.md,
 * docs/32 §11.4). The code is built, so the feature is held back by an explicit
 * switch that is off in every release stage, including `public`; turning it on
 * is a product-owner decision (docs/38). When it is off, review display,
 * ratings, structured-data ratings, submission and owner responses are all
 * unavailable. Existing review rows are kept and stay reachable by moderators.
 */
export function areReviewsEnabled(
  value: string | undefined = process.env.OURVALLEYS_REVIEWS_ENABLED,
): boolean {
  return value === "true";
}
