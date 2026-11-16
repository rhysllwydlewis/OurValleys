import "server-only";
import { createHash, createHmac } from "node:crypto";
import { getServerEnvironment } from "@/lib/env";
import {
  mediaPublicBaseUrl,
  resolveMediaStorage,
  type MediaEnvironment,
  type MediaStorageSettings,
} from "@/lib/media-config";

/**
 * Media storage (ADR-0006) through the S3-compatible API, signed with AWS
 * Signature v4 directly over fetch so no SDK dependency is needed. The bucket
 * is either a private Railway Bucket (`MEDIA_S3_*`) or Cloudflare R2 (`R2_*`);
 * `src/lib/media-config.ts` explains the two. When neither is fully configured
 * the storage reports itself unavailable and upload journeys stay safely
 * closed: the public site renders deliberate placeholders instead
 * (docs/32 §9.1).
 */

type StorageEnvironment = MediaEnvironment;

function readStorageEnvironment(): StorageEnvironment {
  try {
    return getServerEnvironment();
  } catch {
    return {};
  }
}

export function isMediaStorageConfigured(
  environment: StorageEnvironment = readStorageEnvironment(),
): boolean {
  return resolveMediaStorage(environment) !== null;
}

export function publicMediaUrl(
  storageKey: string,
  environment: StorageEnvironment = readStorageEnvironment(),
): string | null {
  const base = mediaPublicBaseUrl(environment);
  return base ? `${base}/${storageKey}` : null;
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256Hex(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * The address of one object. A virtual-hosted bucket is a subdomain of the
 * endpoint; a path-style bucket is the first path segment.
 */
export function objectAddress(
  settings: Pick<MediaStorageSettings, "endpoint" | "bucket" | "pathStyle">,
  storageKey: string,
): { host: string; path: string; url: string } {
  const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");
  const host = settings.pathStyle
    ? settings.endpoint.host
    : `${settings.bucket}.${settings.endpoint.host}`;
  const path = settings.pathStyle
    ? `/${settings.bucket}/${encodedKey}`
    : `/${encodedKey}`;
  return { host, path, url: `${settings.endpoint.protocol}//${host}${path}` };
}

/**
 * A slow or unreachable bucket must not hold a request, or an upload, open
 * indefinitely. Long enough for a 5MB file over a slow link, short enough that
 * a hung connection is released.
 */
const TIMEOUT_MS = { GET: 20_000, PUT: 60_000, DELETE: 15_000 } as const;

async function signedStorageFetch(
  method: "GET" | "PUT" | "DELETE",
  storageKey: string,
  body: Buffer | null,
  contentType: string | null,
  fetchImplementation: typeof fetch,
): Promise<Response> {
  const settings = resolveMediaStorage(readStorageEnvironment());
  if (!settings) {
    throw new Error("Media storage is not configured.");
  }

  const { host, path, url } = objectAddress(settings, storageKey);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body ?? "");

  const headerEntries: [string, string][] = [
    ["host", host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ];
  if (contentType) headerEntries.push(["content-type", contentType]);
  headerEntries.sort(([a], [b]) => (a < b ? -1 : 1));

  const canonicalHeaders = headerEntries
    .map(([name, value]) => `${name}:${value}\n`)
    .join("");
  const signedHeaders = headerEntries.map(([name]) => name).join(";");
  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${settings.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(
      hmac(hmac(`AWS4${settings.secretAccessKey}`, dateStamp), settings.region),
      "s3",
    ),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const headers: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${settings.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
  if (contentType) headers["Content-Type"] = contentType;

  return fetchImplementation(url, {
    method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS[method]),
  });
}

export async function putMediaObject(
  storageKey: string,
  body: Buffer,
  contentType: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  const response = await signedStorageFetch(
    "PUT",
    storageKey,
    body,
    contentType,
    fetchImplementation,
  );
  if (!response.ok) {
    throw new Error(`Media upload failed with status ${response.status}.`);
  }
}

/**
 * Reads one object for the `/media` route. Returns the bucket's response so the
 * caller can stream the body; the caller decides what to do with a non-2xx.
 */
export async function getMediaObject(
  storageKey: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<Response> {
  return signedStorageFetch("GET", storageKey, null, null, fetchImplementation);
}

export async function deleteMediaObject(
  storageKey: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  const response = await signedStorageFetch(
    "DELETE",
    storageKey,
    null,
    null,
    fetchImplementation,
  );
  // 404 is fine: the object is already gone and removal must stay idempotent.
  if (!response.ok && response.status !== 404) {
    throw new Error(`Media removal failed with status ${response.status}.`);
  }
}
