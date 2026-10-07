export const directorySortOptions = [
  "relevance",
  "az",
  "newest",
  "recently-updated",
] as const;

export type DirectorySort = (typeof directorySortOptions)[number];

export const directorySortLabels: Record<DirectorySort, string> = {
  relevance: "Best match",
  az: "A to Z",
  newest: "Newest first",
  "recently-updated": "Recently updated",
};

/** Days after publication during which a listing shows the "New" chip. */
export const NEW_LISTING_DAYS = 14;

/** Unknown or missing values fall back to the default relevance ordering. */
export function parseDirectorySort(value: string | undefined): DirectorySort {
  return (directorySortOptions as readonly string[]).includes(value ?? "")
    ? (value as DirectorySort)
    : "relevance";
}

export function isNewListing(
  publishedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!publishedAt) return false;
  const ageMs = now.getTime() - publishedAt.getTime();
  return ageMs >= 0 && ageMs <= NEW_LISTING_DAYS * 24 * 60 * 60 * 1000;
}
