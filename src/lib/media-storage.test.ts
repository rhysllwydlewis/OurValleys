import { describe, expect, it } from "vitest";
import { isMediaStorageConfigured, publicMediaUrl } from "./media-storage";

const configuredEnvironment = {
  R2_ACCOUNT_ID: "account-id",
  R2_ACCESS_KEY_ID: "access-key",
  R2_SECRET_ACCESS_KEY: "secret-key",
  R2_BUCKET: "media-bucket",
  R2_PUBLIC_BASE_URL: "https://media.example.test",
};

describe("isMediaStorageConfigured", () => {
  it("reports configured when every credential is present", () => {
    expect(isMediaStorageConfigured(configuredEnvironment)).toBe(true);
  });

  it("reports unconfigured for an empty environment", () => {
    expect(isMediaStorageConfigured({})).toBe(false);
  });

  it.each(Object.keys(configuredEnvironment))(
    "reports unconfigured when %s is missing",
    (missingKey) => {
      const environment = { ...configuredEnvironment };
      delete (environment as Record<string, string | undefined>)[missingKey];
      expect(isMediaStorageConfigured(environment)).toBe(false);
    },
  );
});

describe("publicMediaUrl", () => {
  it("joins the public base URL and storage key", () => {
    expect(publicMediaUrl("businesses/logo.png", configuredEnvironment)).toBe(
      "https://media.example.test/businesses/logo.png",
    );
  });

  it("strips a trailing slash from the configured base URL", () => {
    expect(
      publicMediaUrl("businesses/logo.png", {
        ...configuredEnvironment,
        R2_PUBLIC_BASE_URL: "https://media.example.test/",
      }),
    ).toBe("https://media.example.test/businesses/logo.png");
  });

  it("returns null when no public base URL is configured", () => {
    expect(publicMediaUrl("businesses/logo.png", {})).toBeNull();
  });
});
