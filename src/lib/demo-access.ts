import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The demo access code. When the owner sets `OURVALLEYS_DEMO_CODE` on the web
 * service, the shared demo accounts are no longer shown on the sign-in
 * screens to everyone: they appear only for a visitor who has typed that code
 * on the sign-in page (remembered on their device for a while).
 *
 * This decides what the sign-in screens SHOW. It does not change who can
 * sign in: the demo accounts still exist, so someone who already knows a
 * demo password could still use it. Removing the privileged demo accounts
 * altogether is the public-release step (`PRIVILEGED_DEMOS_REMOVED`).
 *
 * Everything here is a pure function of its arguments so it can be tested
 * without a request; `demo-access-server.ts` reads the request for it.
 */

/** A code shorter than this is too easy to guess and is treated as unusable. */
export const DEMO_CODE_MIN_LENGTH = 8;
export const DEMO_ACCESS_COOKIE = "ov-demo-access";
/** How long a device stays unlocked after the code is entered. */
export const DEMO_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 12;

export type DemoAccessMode =
  /** No code and no hide switch: demo accounts are shown to everyone. */
  | "open"
  /** A usable code is set: shown only after the code has been entered. */
  | "code"
  /** Hidden from everyone: the hide switch without a code, or a code that is
      set but too short to use (which fails closed rather than open). */
  | "hidden";

/**
 * The variables read here: `OURVALLEYS_DEMO_CODE`, `OURVALLEYS_HIDE_DEMO`
 * and `BETTER_AUTH_SECRET`. Typed loosely so `process.env` fits.
 */
type DemoEnvironment = Readonly<Record<string, string | undefined>>;

export function readDemoCode(
  environment: DemoEnvironment = process.env,
): string | null {
  const code = environment.OURVALLEYS_DEMO_CODE?.trim() ?? "";
  return code.length >= DEMO_CODE_MIN_LENGTH ? code : null;
}

export function getDemoAccessMode(
  environment: DemoEnvironment = process.env,
): DemoAccessMode {
  const raw = environment.OURVALLEYS_DEMO_CODE?.trim() ?? "";
  if (raw) {
    // The code needs the signing secret to be remembered; without either a
    // usable code or the secret, nothing can be unlocked.
    return readDemoCode(environment) && environment.BETTER_AUTH_SECRET
      ? "code"
      : "hidden";
  }
  return environment.OURVALLEYS_HIDE_DEMO?.trim().toLowerCase() === "true"
    ? "hidden"
    : "open";
}

/**
 * The value an unlocked device carries. It is derived from the code and the
 * server's secret, so it cannot be forged, and changing either one locks
 * every device again. It never contains the code itself.
 */
export function demoAccessToken(
  environment: DemoEnvironment = process.env,
): string | null {
  const code = readDemoCode(environment);
  const secret = environment.BETTER_AUTH_SECRET;
  if (!code || !secret) return null;
  return createHmac("sha256", secret)
    .update(`ourvalleys-demo-access:${code}`)
    .digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  // Compared as fixed-length digests so neither the length nor the position
  // of the first difference can be learned from timing.
  const a = createHmac("sha256", "demo-access-compare").update(left).digest();
  const b = createHmac("sha256", "demo-access-compare").update(right).digest();
  return timingSafeEqual(a, b);
}

/** Whether a typed code is the configured one. */
export function isDemoCodeCorrect(
  submitted: string,
  environment: DemoEnvironment = process.env,
): boolean {
  const code = readDemoCode(environment);
  if (!code) return false;
  return safeEqual(submitted.trim(), code);
}

/** Whether demo accounts should be shown to a visitor carrying this cookie. */
export function areDemosShown(
  cookieValue: string | undefined,
  environment: DemoEnvironment = process.env,
): boolean {
  const mode = getDemoAccessMode(environment);
  if (mode === "open") return true;
  if (mode === "hidden") return false;
  const expected = demoAccessToken(environment);
  return Boolean(expected && cookieValue && safeEqual(cookieValue, expected));
}
