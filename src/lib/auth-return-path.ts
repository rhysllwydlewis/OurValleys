export const DEFAULT_AUTH_RETURN_PATH = "/account";

/** Where the platform administrator lands when nothing more specific was asked for. */
export const ADMIN_HOME_PATH = "/admin";

export function getSafeAuthReturnPath(
  value: string | string[] | null | undefined,
): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("\0")
  ) {
    return DEFAULT_AUTH_RETURN_PATH;
  }

  try {
    const base = new URL("https://ourvalleys.invalid");
    const parsed = new URL(candidate, base);

    if (parsed.origin !== base.origin || parsed.pathname.startsWith("/login")) {
      return DEFAULT_AUTH_RETURN_PATH;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_RETURN_PATH;
  }
}

/**
 * Where to send someone who has just signed in (or opens a sign-in page while
 * already signed in). A specific, safe return path always wins. When there is
 * none, the platform administrator goes to the admin area and everyone else to
 * their account.
 */
export function getPostSignInPath(
  value: string | string[] | null | undefined,
  role: string | null | undefined,
): string {
  const returnTo = getSafeAuthReturnPath(value);

  return returnTo === DEFAULT_AUTH_RETURN_PATH && role === "admin"
    ? ADMIN_HOME_PATH
    : returnTo;
}

/**
 * Carries a non-default return path across the sign-in, registration and
 * password-recovery pages so a visitor sent to sign in for a specific journey
 * does not lose it by switching between them.
 */
export function withAuthReturnPath(
  path: "/login" | "/register" | "/forgot-password",
  value: string | string[] | null | undefined,
): string {
  const returnTo = getSafeAuthReturnPath(value);

  return returnTo === DEFAULT_AUTH_RETURN_PATH
    ? path
    : `${path}?next=${encodeURIComponent(returnTo)}`;
}
