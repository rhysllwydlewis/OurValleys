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

  it("accepts Postmark as the public-release email provider", () => {
    const publicEnvironment = {
      ...baseEnvironment,
      OURVALLEYS_RELEASE_STAGE: "public",
      PRIVILEGED_DEMOS_REMOVED: "true",
      POLICIES_APPROVED: "true",
      ADMIN_MFA_READY: "true",
      EMAIL_FROM: "OurValleys <hello@ourvalleys.example>",
      R2_ACCOUNT_ID: "account",
      R2_ACCESS_KEY_ID: "access",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "bucket",
      R2_PUBLIC_BASE_URL: "https://media.ourvalleys.example",
    };
    expect(() => parseServerEnvironment(publicEnvironment)).toThrow(
      /POSTMARK_API_KEY/,
    );
    expect(
      parseServerEnvironment({
        ...publicEnvironment,
        POSTMARK_API_KEY: "server-token",
      }).POSTMARK_API_KEY,
    ).toBe("server-token");
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

  describe("media storage at public release", () => {
    const publicWithoutStorage = {
      ...baseEnvironment,
      OURVALLEYS_RELEASE_STAGE: "public",
      PRIVILEGED_DEMOS_REMOVED: "true",
      POLICIES_APPROVED: "true",
      ADMIN_MFA_READY: "true",
      POSTMARK_API_KEY: "server-token",
      EMAIL_FROM: "OurValleys <hello@ourvalleys.example>",
    };
    const railwayBucket = {
      MEDIA_S3_ENDPOINT: "https://storage.example.test",
      MEDIA_S3_BUCKET: "ourvalleys-media",
      MEDIA_S3_REGION: "auto",
      MEDIA_S3_ACCESS_KEY_ID: "access",
      MEDIA_S3_SECRET_ACCESS_KEY: "secret",
    };

    it("fails closed when no storage is configured", () => {
      expect(() => parseServerEnvironment(publicWithoutStorage)).toThrow(
        /MEDIA_S3_BUCKET/,
      );
    });

    it("accepts a complete private bucket without any R2 variable or public host", () => {
      const result = parseServerEnvironment({
        ...publicWithoutStorage,
        ...railwayBucket,
      });
      expect(result.OURVALLEYS_RELEASE_STAGE).toBe("public");
      expect(result.R2_BUCKET).toBeUndefined();
    });

    it.each(
      Object.keys(railwayBucket).filter((key) => key !== "MEDIA_S3_REGION"),
    )(
      "fails a public release when %s is missing from the bucket settings",
      (missing) => {
        const incomplete: Record<string, string> = { ...railwayBucket };
        delete incomplete[missing];
        expect(() =>
          parseServerEnvironment({ ...publicWithoutStorage, ...incomplete }),
        ).toThrow(/MEDIA_S3_BUCKET/);
      },
    );

    it("still needs the R2 public host when R2 is used instead", () => {
      const r2 = {
        R2_ACCOUNT_ID: "account",
        R2_ACCESS_KEY_ID: "access",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "media",
      };
      expect(() =>
        parseServerEnvironment({ ...publicWithoutStorage, ...r2 }),
      ).toThrow(/MEDIA_S3_BUCKET/);
      expect(
        parseServerEnvironment({
          ...publicWithoutStorage,
          ...r2,
          R2_PUBLIC_BASE_URL: "https://media.ourvalleys.example",
        }).R2_BUCKET,
      ).toBe("media");
    });

    it("does not require storage outside public release", () => {
      expect(() =>
        parseServerEnvironment({
          ...baseEnvironment,
          OURVALLEYS_RELEASE_STAGE: "private_pilot",
        }),
      ).not.toThrow();
    });
  });
});
