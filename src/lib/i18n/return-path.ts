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
