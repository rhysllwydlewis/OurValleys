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

    const message = (environment: Record<string, string>): string => {
      try {
        parseServerEnvironment(environment);
      } catch (error) {
        return (error as Error).message;
      }
      throw new Error("Expected the environment to be rejected.");
    };

    it("fails closed when no storage is configured, naming every bucket field", () => {
      const reported = message(publicWithoutStorage);
      for (const field of Object.keys(railwayBucket).filter(
        (key) => key !== "MEDIA_S3_REGION",
      )) {
        expect(reported).toContain(field);
      }
    });

    it("accepts a complete private bucket without any R2 variable or public host", () => {
      const result = parseServerEnvironment({
        ...publicWithoutStorage,
        ...railwayBucket,
      });
      expect(result.OURVALLEYS_RELEASE_STAGE).toBe("public");
      expect(result.R2_BUCKET).toBeUndefined();
    });

    const requiredBucketFields = Object.keys(railwayBucket).filter(
      (key) => key !== "MEDIA_S3_REGION",
    );

    it.each(requiredBucketFields)(
      "names exactly %s when it is the one missing, at public release",
      (missing) => {
        const incomplete: Record<string, string> = { ...railwayBucket };
        delete incomplete[missing];
        const reported = message({ ...publicWithoutStorage, ...incomplete });
        expect(reported).toContain(missing);
        for (const other of requiredBucketFields.filter(
          (field) => field !== missing,
        )) {
          expect(reported).not.toContain(other);
        }
      },
    );

    it.each(requiredBucketFields)(
      "rejects a half-set bucket (%s missing) at every stage, not just public",
      (missing) => {
        const incomplete: Record<string, string> = { ...railwayBucket };
        delete incomplete[missing];
        for (const stage of ["development", "private_pilot", "public"]) {
          expect(
            message({
              ...publicWithoutStorage,
              ...incomplete,
              OURVALLEYS_RELEASE_STAGE: stage,
            }),
          ).toContain(missing);
        }
      },
    );

    it("accepts a complete bucket at the development stage too", () => {
      expect(() =>
        parseServerEnvironment({
          ...baseEnvironment,
          OURVALLEYS_RELEASE_STAGE: "development",
          ...railwayBucket,
        }),
      ).not.toThrow();
    });

    it.each(["development", "private_pilot", "public"])(
      "rejects a bucket whose endpoint is not an http(s) URL at the %s stage, instead of leaving uploads quietly off",
      (stage) => {
        expect(
          message({
            ...publicWithoutStorage,
            ...railwayBucket,
            OURVALLEYS_RELEASE_STAGE: stage,
            MEDIA_S3_ENDPOINT: "ftp://storage.example.test",
          }),
        ).toContain("MEDIA_S3_ENDPOINT");
      },
    );

    it("names a field once even when two checks object to it", () => {
      const reported = message({
        ...publicWithoutStorage,
        ...railwayBucket,
        MEDIA_S3_ENDPOINT: "${{unresolved.ENDPOINT}}",
      });
      expect(reported.match(/MEDIA_S3_ENDPOINT/g)).toHaveLength(1);
    });

    it.each(["bad/name", "my bucket", "evil.example.com/x", "-lead", ""])(
      "rejects the bucket name %j, which could point requests elsewhere",
      (name) => {
        const reported = message({
          ...publicWithoutStorage,
          ...railwayBucket,
          MEDIA_S3_BUCKET: name,
        });
        expect(reported).toContain("MEDIA_S3_BUCKET");
      },
    );

    it("names the missing R2 field when R2 is the set being used", () => {
      const r2 = {
        R2_ACCOUNT_ID: "account",
        R2_ACCESS_KEY_ID: "access",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "media",
      };
      const reported = message({ ...publicWithoutStorage, ...r2 });
      expect(reported).toContain("R2_PUBLIC_BASE_URL");
      expect(reported).not.toContain("MEDIA_S3_");
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
