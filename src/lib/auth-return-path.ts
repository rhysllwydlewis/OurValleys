export const DEFAULT_AUTH_RETURN_PATH = "/account";

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
