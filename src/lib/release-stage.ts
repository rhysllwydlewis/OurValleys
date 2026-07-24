import type { Metadata } from "next";

export const releaseStages = ["development", "private_pilot", "public"] as const;
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
