import { describe, expect, it } from "vitest";
import { parseServerEnvironment } from "./env";
import {
  getPublicPageRobots,
  getReleaseStage,
  isPublicRelease,
  shouldExposePrivilegedPublicDemos,
} from "./release-stage";

const baseEnvironment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://postgres@db.example.test:5432/ourvalleys",
  BETTER_AUTH_SECRET: "x".repeat(64),
  BETTER_AUTH_URL: "https://ourvalleys.example",
  NEXT_PUBLIC_SITE_URL: "https://ourvalleys.example",
};

describe("isPublicRelease", () => {
  it("is true only for the public stage", () => {
    expect(isPublicRelease("public")).toBe(true);
    expect(isPublicRelease("private_pilot")).toBe(false);
    expect(isPublicRelease("development")).toBe(false);
  });

  it("treats an unknown or missing value as not public", () => {
    expect(isPublicRelease("unknown")).toBe(false);
    expect(isPublicRelease(undefined)).toBe(false);
  });
});

describe("release stage", () => {
  it("defaults unknown values to development and noindex", () => {
    expect(getReleaseStage("unknown")).toBe("development");
    expect(getPublicPageRobots("private_pilot")).toEqual({
      index: false,
      follow: false,
    });
    expect(shouldExposePrivilegedPublicDemos("private_pilot")).toBe(true);
  });

  it("normalises blank optional provider values outside public release", () => {
    const result = parseServerEnvironment({
      ...baseEnvironment,
      OURVALLEYS_RELEASE_STAGE: "private_pilot",
      RESEND_API_KEY: "",
      EMAIL_FROM: "  ",
      R2_ACCOUNT_ID: "",
      R2_ACCESS_KEY_ID: "",
      R2_SECRET_ACCESS_KEY: "",
      R2_BUCKET: "",
      R2_PUBLIC_BASE_URL: "",
    });

    expect(result.RESEND_API_KEY).toBeUndefined();
    expect(result.EMAIL_FROM).toBeUndefined();
    expect(result.R2_PUBLIC_BASE_URL).toBeUndefined();
  });

  it("fails a public release without independently verified gates", () => {
    expect(() =>
      parseServerEnvironment({
        ...baseEnvironment,
        OURVALLEYS_RELEASE_STAGE: "public",
      }),
    ).toThrow(/PRIVILEGED_DEMOS_REMOVED/);
  });

  it("accepts a fully configured public release", () => {
    const result = parseServerEnvironment({
      ...baseEnvironment,
      OURVALLEYS_RELEASE_STAGE: "public",
      PRIVILEGED_DEMOS_REMOVED: "true",
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
