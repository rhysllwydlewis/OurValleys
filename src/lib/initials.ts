/**
 * Derives up to two-letter initials from a name, ignoring punctuation.
 * Used for avatar badges where a photo is unavailable.
 */
export function getInitials(value: string, maxWords = 2): string {
  const words = value
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0);

  return words
    .slice(0, maxWords)
    .map((word) => (word[0] ?? "").toLocaleUpperCase("en-GB"))
    .join("");
}

const toneCount = 5;

/**
 * Deterministically maps a seed (a stable id or name) to one of a small,
 * curated set of on-brand avatar tones, so a list of avatars reads as
 * varied without introducing arbitrary, off-brand colours.
 */
export function getAvatarTone(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return (hash % toneCount) + 1;
}
