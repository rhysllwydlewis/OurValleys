/**
 * Where uploaded pictures and menu documents are stored, and how visitors reach
 * them. Kept free of imports so `next.config.ts` and the environment schema can
 * use it.
 *
 * Two providers, one S3-compatible protocol:
 *
 * - `s3`: any S3-compatible bucket, normally a private Railway Bucket
 *   (`MEDIA_S3_*`). A private bucket has no public address, so the site serves
 *   the files itself from `/media/<key>` (see `src/app/media`).
 * - `r2`: Cloudflare R2 (`R2_*`), whose bucket has its own public host
 *   (`R2_PUBLIC_BASE_URL`).
 *
 * When both are set, the S3 settings win, so a stale R2 host can never point
 * visitors at files that live in the other bucket.
 */

export type MediaEnvironment = {
  // Lets `process.env` be passed straight in.
  [name: string]: string | undefined;
  MEDIA_S3_ENDPOINT?: string;
  MEDIA_S3_BUCKET?: string;
  MEDIA_S3_REGION?: string;
  MEDIA_S3_ACCESS_KEY_ID?: string;
  MEDIA_S3_SECRET_ACCESS_KEY?: string;
  /** "true" for providers that need `endpoint/bucket/key` addressing. */
  MEDIA_S3_PATH_STYLE?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  R2_PUBLIC_BASE_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  RAILWAY_PUBLIC_DOMAIN?: string;
};

export type MediaStorageSettings = {
  provider: "s3" | "r2";
  /** Base URL of the S3 API, without the bucket. */
  endpoint: URL;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** False: the bucket is a subdomain of the endpoint. True: it is a path. */
  pathStyle: boolean;
};

/** Where the site serves private-bucket files from. */
export const MEDIA_ROUTE_PREFIX = "/media";

function present(value: string | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseUrl(value: string | undefined): URL | null {
  if (!present(value)) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function s3Settings(
  environment: MediaEnvironment,
): MediaStorageSettings | null {
  const endpoint = parseUrl(environment.MEDIA_S3_ENDPOINT);
  if (
    !endpoint ||
    !present(environment.MEDIA_S3_BUCKET) ||
    !present(environment.MEDIA_S3_ACCESS_KEY_ID) ||
    !present(environment.MEDIA_S3_SECRET_ACCESS_KEY)
  ) {
    return null;
  }
  return {
    provider: "s3",
    endpoint,
    bucket: environment.MEDIA_S3_BUCKET.trim(),
    region: present(environment.MEDIA_S3_REGION)
      ? environment.MEDIA_S3_REGION.trim()
      : "auto",
    accessKeyId: environment.MEDIA_S3_ACCESS_KEY_ID.trim(),
    secretAccessKey: environment.MEDIA_S3_SECRET_ACCESS_KEY.trim(),
    pathStyle: environment.MEDIA_S3_PATH_STYLE?.trim().toLowerCase() === "true",
  };
}

function r2Settings(
  environment: MediaEnvironment,
): MediaStorageSettings | null {
  if (
    !present(environment.R2_ACCOUNT_ID) ||
    !present(environment.R2_ACCESS_KEY_ID) ||
    !present(environment.R2_SECRET_ACCESS_KEY) ||
    !present(environment.R2_BUCKET) ||
    !present(environment.R2_PUBLIC_BASE_URL)
  ) {
    return null;
  }
  return {
    provider: "r2",
    endpoint: new URL(
      `https://${environment.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
    ),
    bucket: environment.R2_BUCKET.trim(),
    region: "auto",
    accessKeyId: environment.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: environment.R2_SECRET_ACCESS_KEY.trim(),
    pathStyle: true,
  };
}

/** The settings to use, or null when no complete storage is configured. */
export function resolveMediaStorage(
  environment: MediaEnvironment,
): MediaStorageSettings | null {
  return s3Settings(environment) ?? r2Settings(environment);
}

export function isMediaStorageComplete(environment: MediaEnvironment): boolean {
  return resolveMediaStorage(environment) !== null;
}

function siteOrigin(environment: MediaEnvironment): string | null {
  const explicit = parseUrl(environment.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit.origin;
  if (present(environment.RAILWAY_PUBLIC_DOMAIN)) {
    return (
      parseUrl(`https://${environment.RAILWAY_PUBLIC_DOMAIN.trim()}`)?.origin ??
      null
    );
  }
  return null;
}

/**
 * The URL prefix pictures are loaded from, with no trailing slash, or null when
 * there is none. For an S3 bucket it is the site's own `/media` route, as an
 * absolute URL so structured data and link previews stay valid.
 */
export function mediaPublicBaseUrl(
  environment: MediaEnvironment,
): string | null {
  if (s3Settings(environment)) {
    const origin = siteOrigin(environment);
    return origin ? `${origin}${MEDIA_ROUTE_PREFIX}` : null;
  }
  const base = parseUrl(environment.R2_PUBLIC_BASE_URL);
  return base ? base.toString().replace(/\/+$/, "") : null;
}

/**
 * The only object names the `/media` route will fetch: a known top folder,
 * one to three folder levels of plain identifiers, and a picture or PDF file
 * name. Rejects anything else (dots, encoded slashes, other folders) before
 * the bucket is contacted, so the route cannot be used to read other objects.
 */
const servableKey =
  /^(?:business|guides|stories|places)(?:\/[A-Za-z0-9-]{1,64}){1,3}\/[A-Za-z0-9-]{1,80}\.(?:jpg|jpeg|png|webp|pdf)$/;

export function isServableMediaKey(key: string): boolean {
  return key.length <= 300 && servableKey.test(key);
}

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/** The type to serve a file as, from its extension, never from the bucket. */
export function mediaContentType(key: string): string {
  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  return contentTypes[extension] ?? "application/octet-stream";
}
