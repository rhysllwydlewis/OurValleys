const httpsUrlPattern = /^https:\/\/\S+$/;

/**
 * A blank value is valid — it clears the profile photo back to the
 * initials-based avatar. Anything non-blank must be a full https:// link,
 * since there's no upload pipeline; users paste a link to an image they
 * host elsewhere.
 */
export function isValidProfileImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return httpsUrlPattern.test(trimmed);
}
