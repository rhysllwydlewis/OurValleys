export const SITE_QUERY_MIN_LENGTH = 2;
export const SITE_QUERY_MAX_LENGTH = 80;

/**
 * Trims and bounds the typed text. Returns null when it is too short to
 * search or holds no letter or digit, so callers can show the idle state without querying.
 */
export function normaliseSiteQuery(
  value: string | null | undefined,
): string | null {
  const trimmed = value
    ?.trim()
    .replace(/\s+/g, " ")
    .slice(0, SITE_QUERY_MAX_LENGTH)
    .trim();
  if (!trimmed || trimmed.length < SITE_QUERY_MIN_LENGTH) return null;
  // Punctuation alone ("%%", "__", "..") is not a search; the directory reads
  // "%" and "_" as wildcards and would answer with everything.
  return /[\p{L}\p{N}]/u.test(trimmed) ? trimmed : null;
}

/** Escapes LIKE wildcards so typed text is matched literally. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** Lower-cases and strips accents so "Y Rhondda" and "Ŷ Rhondda" are treated alike. */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** True when any of the labels contains the query, ignoring case and accents. */
export function matchesFolded(
  labels: ReadonlyArray<string | null | undefined>,
  query: string,
): boolean {
  const needle = foldText(query);
  return labels.some((label) => label && foldText(label).includes(needle));
}
