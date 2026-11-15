import type { Metadata } from "next";

export const releaseStages = [
  "development",
  "private_pilot",
  "public",
] as const;
export type ReleaseStage = (typeof releaseStages)[number];

export function getReleaseStage(
  value: string | undefined = process.env.OURVALLEYS_RELEASE_STAGE,
): ReleaseStage {
  return releaseStages.includes(value as ReleaseStage)
    ? (value as ReleaseStage)
    : "development";
}

export function isPublicRelease(
  value: string | undefined = process.env.OURVALLEYS_RELEASE_STAGE,
): boolean {
  return getReleaseStage(value) === "public";
}

export function getPublicPageRobots(
  value: string | undefined = process.env.OURVALLEYS_RELEASE_STAGE,
): Metadata["robots"] {
  return isPublicRelease(value)
    ? { index: true, follow: true }
    : { index: false, follow: false };
}

export function shouldExposePrivilegedPublicDemos(
  value: string | undefined = process.env.OURVALLEYS_RELEASE_STAGE,
): boolean {
  return getReleaseStage(value) !== "public";
}

/**
 * Owner switch: `OURVALLEYS_HIDE_DEMO=true` stops the sign-in screens
 * advertising the shared demo accounts, so the site looks like a normal one.
 * Unset (or any other value) leaves them shown, which is what tests and local
 * development expect.
 *
 * This only hides the demo logins from view. The demo accounts still exist and
 * keep their usual restrictions; it is a cosmetic switch, not a security one.
 */
export function isDemoAccessHidden(
  value: string | undefined = process.env.OURVALLEYS_HIDE_DEMO,
): boolean {
  return value?.trim().toLowerCase() === "true";
}
