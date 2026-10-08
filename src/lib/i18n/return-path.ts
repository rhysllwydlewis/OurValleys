import { getSafeAuthReturnPath } from "@/lib/auth-return-path";

/**
 * Same-origin Referer path, so the visitor lands back where they were after
 * switching language. Anything unparseable, cross-origin or unsafe falls back
 * to the homepage.
 */
export function returnPathFromReferer(
  referer: string | null,
  host: string | null,
): string {
  if (!referer || !host) return "/";
  try {
    const url = new URL(referer);
    if (url.host !== host) return "/";
    const safe = getSafeAuthReturnPath(`${url.pathname}${url.search}`);
    // getSafeAuthReturnPath substitutes /account for unsafe paths; that is
    // the wrong fallback here unless the visitor really was on /account.
    return safe === "/account" && url.pathname !== "/account" ? "/" : safe;
  } catch {
    return "/";
  }
}

/**
 * Prefers the explicit path the form submitted (validated as a safe local
 * path), then the same-origin Referer, then the homepage.
 */
export function returnPathFromForm(
  returnTo: string | null,
  referer: string | null,
  host: string | null,
): string {
  if (returnTo && returnTo.startsWith("/") && returnTo.length <= 2048) {
    const safe = getSafeAuthReturnPath(returnTo);
    // getSafeAuthReturnPath substitutes /account when it rejects a value, so
    // only trust that result when the caller really asked for /account.
    if (safe !== "/account" || returnTo.split(/[?#]/)[0] === "/account") {
      return safe.split("#")[0] ?? "/";
    }
  }
  return returnPathFromReferer(referer, host);
}
