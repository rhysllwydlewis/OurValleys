import { describe, expect, it } from "vitest";
import { parseServerEnvironment } from "./env";
import {
  getPublicPageRobots,
  getReleaseStage,
  shouldExposePrivilegedPublicDemos,
} from "./release-stage";

const baseEnvironment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://postgres@db.example.test:5432/ourvalleys",
  BETTER_AUTH_SECRET: "x".repeat(64),
  BETTER_AUTH_URL: "https://ourvalleys.example",
  NEXT_PUBLIC_SITE_URL: "https://ourvalleys.example",
};

describe("release stage", () => {
  it("defaults unknown values to development and noindex", () => {
    expect(getReleaseStage("unknown")).toBe("development");
    expect(getPublicPageRobots("private_pilot")).toEqual({
      index: false,
      follow: false,
    });
    expect(shouldExposePrivilegedPublicDemos("private_pilot")).toBe(true);
  });

  it("fails a public release without independently verified gates", () => {
    expect(() =>
      parseServerEnvironment({
        ...baseEnvironment,
        OURVALLEYS_RELEASE_STAGE: "public",
      }),
    ).toThrow(/PUBLIC_DEMOS_REMOVED/);
  });

  it("accepts a fully configured public release", () => {
    const result = parseServerEnvironment({
      ...baseEnvironment,
      OURVALLEYS_RELEASE_STAGE: "public",
      PUBLIC_DEMOS_REMOVED: "true",
      POLICIES_APPROVED: "true",
      ADMIN_MFA_READY: "true",
      RESEND_API_KEY: "resend-test",
      EMAIL_FROM: "OurValleys <hello@ourvalleys.example>",
      R2_ACCOUNT_ID: "account",
      R2_ACCESS_KEY_ID: "access",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "media",
      R2_PUBLIC_BASE_URL: "https://media.ourvalleys.example",
    });

    expect(result.OURVALLEYS_RELEASE_STAGE).toBe("public");
    expect(getPublicPageRobots(result.OURVALLEYS_RELEASE_STAGE)).toEqual({
      index: true,
      follow: true,
    });
    expect(
      shouldExposePrivilegedPublicDemos(result.OURVALLEYS_RELEASE_STAGE),
    ).toBe(false);
  });
});
