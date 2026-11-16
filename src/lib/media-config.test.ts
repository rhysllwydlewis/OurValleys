import { describe, expect, it } from "vitest";
import {
  isMediaStorageComplete,
  isServableMediaKey,
  mediaContentType,
  mediaPublicBaseUrl,
  resolveMediaStorage,
} from "./media-config";

const railwayStorage = {
  MEDIA_S3_ENDPOINT: "https://t3.storageapi.dev",
  MEDIA_S3_BUCKET: "ourvalleys-media",
  MEDIA_S3_ACCESS_KEY_ID: "access",
  MEDIA_S3_SECRET_ACCESS_KEY: "secret",
};
const railway = {
  ...railwayStorage,
  NEXT_PUBLIC_SITE_URL: "https://ourvalleys.co.uk",
};
const r2 = {
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "r2-access",
  R2_SECRET_ACCESS_KEY: "r2-secret",
  R2_BUCKET: "r2-media",
  R2_PUBLIC_BASE_URL: "https://media.ourvalleys.co.uk",
};

describe("resolveMediaStorage", () => {
  it("reads a private bucket, virtual-hosted, region auto by default", () => {
    const settings = resolveMediaStorage(railway);
    expect(settings).toMatchObject({
      provider: "s3",
      bucket: "ourvalleys-media",
      region: "auto",
      pathStyle: false,
      accessKeyId: "access",
    });
    expect(settings?.endpoint.host).toBe("t3.storageapi.dev");
  });

  it("honours an explicit region and path-style addressing", () => {
    expect(
      resolveMediaStorage({
        ...railway,
        MEDIA_S3_REGION: "eu-west-1",
        MEDIA_S3_PATH_STYLE: "TRUE",
      }),
    ).toMatchObject({ region: "eu-west-1", pathStyle: true });
  });

  it("reads Cloudflare R2 as a path-style bucket on its account host", () => {
    const settings = resolveMediaStorage(r2);
    expect(settings).toMatchObject({
      provider: "r2",
      bucket: "r2-media",
      region: "auto",
      pathStyle: true,
    });
    expect(settings?.endpoint.host).toBe("account.r2.cloudflarestorage.com");
  });

  it("prefers the private bucket when both are configured", () => {
    expect(resolveMediaStorage({ ...r2, ...railway })?.provider).toBe("s3");
  });

  it.each([
    "MEDIA_S3_ENDPOINT",
    "MEDIA_S3_BUCKET",
    "MEDIA_S3_ACCESS_KEY_ID",
    "MEDIA_S3_SECRET_ACCESS_KEY",
  ])("is unconfigured when %s is missing, blank or invalid", (field) => {
    const without: Record<string, string> = { ...railway };
    delete without[field];
    expect(isMediaStorageComplete(without)).toBe(false);
    expect(isMediaStorageComplete({ ...railway, [field]: "  " })).toBe(false);
  });

  it("rejects an endpoint that is not an http(s) URL", () => {
    expect(
      isMediaStorageComplete({ ...railway, MEDIA_S3_ENDPOINT: "ftp://x" }),
    ).toBe(false);
    expect(
      isMediaStorageComplete({ ...railway, MEDIA_S3_ENDPOINT: "not a url" }),
    ).toBe(false);
  });

  it("needs the R2 public host to count R2 as complete", () => {
    expect(isMediaStorageComplete(r2)).toBe(true);
    expect(isMediaStorageComplete({ ...r2, R2_PUBLIC_BASE_URL: "" })).toBe(
      false,
    );
  });

  it("is unconfigured for an empty environment", () => {
    expect(resolveMediaStorage({})).toBeNull();
  });
});

describe("mediaPublicBaseUrl", () => {
  it("serves a private bucket from the site's own /media route", () => {
    expect(mediaPublicBaseUrl(railway)).toBe("https://ourvalleys.co.uk/media");
  });

  it("uses only the origin of the site URL", () => {
    expect(
      mediaPublicBaseUrl({
        ...railway,
        NEXT_PUBLIC_SITE_URL: "https://ourvalleys.co.uk/some/path/",
      }),
    ).toBe("https://ourvalleys.co.uk/media");
  });

  it("falls back to Railway's public domain", () => {
    expect(
      mediaPublicBaseUrl({
        ...railwayStorage,
        RAILWAY_PUBLIC_DOMAIN: "ourvalleys-production.up.railway.app",
      }),
    ).toBe("https://ourvalleys-production.up.railway.app/media");
  });

  it("has no base when the site's address is unknown", () => {
    expect(mediaPublicBaseUrl(railwayStorage)).toBeNull();
  });

  it("never points visitors at a stale R2 host while the private bucket is in use", () => {
    expect(mediaPublicBaseUrl({ ...r2, ...railway })).toBe(
      "https://ourvalleys.co.uk/media",
    );
  });

  it("keeps the R2 public host, without a trailing slash, when R2 is used", () => {
    expect(
      mediaPublicBaseUrl({
        ...r2,
        R2_PUBLIC_BASE_URL: "https://media.ourvalleys.co.uk/",
      }),
    ).toBe("https://media.ourvalleys.co.uk");
  });

  it("still returns the R2 host without R2 credentials, as before", () => {
    expect(
      mediaPublicBaseUrl({ R2_PUBLIC_BASE_URL: "https://media.example.test" }),
    ).toBe("https://media.example.test");
  });

  it("is null when nothing is configured", () => {
    expect(mediaPublicBaseUrl({})).toBeNull();
  });
});

describe("isServableMediaKey", () => {
  const id = "0b9d4f3e-6c1a-4c52-9a43-1f7a2d8e5b60";
  const file = "7d2c9a54-3b1e-4f06-8a97-c5e0d1b2a3f4";

  it.each([
    `business/${id}/logo/${file}.png`,
    `business/${id}/hero/${file}.jpg`,
    `business/${id}/gallery/${file}.webp`,
    `business/${id}/offer/${file}.jpeg`,
    `business/${id}/event/${file}.png`,
    `business/${id}/documents/menu-${file}.pdf`,
    `business/${id}/documents/menu-${file}.png`,
    `guides/${id}/${file}.webp`,
    `stories/${id}/${file}.jpg`,
    `places/${id}/${file}.png`,
  ])("accepts the shape the upload code creates: %s", (key) => {
    expect(isServableMediaKey(key)).toBe(true);
  });

  it.each([
    "",
    "business",
    "business/",
    `business/${id}`,
    `secrets/${id}/${file}.png`,
    `../business/${id}/logo/${file}.png`,
    `business/../${id}/${file}.png`,
    `business/${id}/../../etc/${file}.png`,
    `business/${id}/logo/${file}.PNG`,
    `business/${id}/logo/${file}.svg`,
    `business/${id}/logo/${file}.html`,
    `business/${id}/logo/${file}.png.html`,
    `business/${id}/logo/${file}`,
    `business/${id}/logo/.${file}.png`,
    `business//${id}/${file}.png`,
    `business/${id}/logo/${file}.png/`,
    `business/${id}\\logo/${file}.png`,
    `business/${id}/lo go/${file}.png`,
    `business/${id}/%2e%2e/${file}.png`,
    `business/a/b/c/d/${file}.png`,
    `business/${id}/logo/${"x".repeat(81)}.png`,
    `${"business/x/".repeat(40)}${file}.png`,
  ])("refuses %j", (key) => {
    expect(isServableMediaKey(key)).toBe(false);
  });
});

describe("mediaContentType", () => {
  it("is decided by the extension, case-insensitively", () => {
    expect(mediaContentType("a/b.jpg")).toBe("image/jpeg");
    expect(mediaContentType("a/b.jpeg")).toBe("image/jpeg");
    expect(mediaContentType("a/b.png")).toBe("image/png");
    expect(mediaContentType("a/b.webp")).toBe("image/webp");
    expect(mediaContentType("a/b.pdf")).toBe("application/pdf");
    expect(mediaContentType("a/b.PNG")).toBe("image/png");
  });

  it("never serves an unknown type as anything executable", () => {
    expect(mediaContentType("a/b.html")).toBe("application/octet-stream");
    expect(mediaContentType("a/b")).toBe("application/octet-stream");
  });
});
