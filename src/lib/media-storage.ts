import "server-only";
import { createHash, createHmac } from "node:crypto";
import { getServerEnvironment } from "@/lib/env";

/**
 * Cloudflare R2 media storage (ADR-0006) through the S3-compatible API,
 * signed with AWS Signature v4 directly over fetch so no SDK dependency is
 * needed. When the R2 credentials are not configured the storage reports
 * itself unavailable and upload journeys stay safely closed — the public
 * site renders deliberate placeholders instead (docs/32 §9.1).
 */

type StorageEnvironment = {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  R2_PUBLIC_BASE_URL?: string;
};

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
  return Boolean(
    environment.R2_ACCOUNT_ID &&
    environment.R2_ACCESS_KEY_ID &&
    environment.R2_SECRET_ACCESS_KEY &&
    environment.R2_BUCKET &&
    environment.R2_PUBLIC_BASE_URL,
  );
}

export function publicMediaUrl(
  storageKey: string,
  environment: StorageEnvironment = readStorageEnvironment(),
): string | null {
  if (!environment.R2_PUBLIC_BASE_URL) return null;
  return `${environment.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${storageKey}`;
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256Hex(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function signedR2Fetch(
  method: "PUT" | "DELETE",
  storageKey: string,
  body: Buffer | null,
  contentType: string | null,
  fetchImplementation: typeof fetch,
): Promise<Response> {
  const environment = readStorageEnvironment();
  if (!isMediaStorageConfigured(environment)) {
    throw new Error("Media storage is not configured.");
  }

  const host = `${environment.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const encodedKey = storageKey.split("/").map(encodeURIComponent).join("/");
  const path = `/${environment.R2_BUCKET}/${encodedKey}`;
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

  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(
      hmac(hmac(`AWS4${environment.R2_SECRET_ACCESS_KEY}`, dateStamp), "auto"),
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
    Authorization: `AWS4-HMAC-SHA256 Credential=${environment.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
  if (contentType) headers["Content-Type"] = contentType;

  return fetchImplementation(`https://${host}${path}`, {
    method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
  });
}

export async function putMediaObject(
  storageKey: string,
  body: Buffer,
  contentType: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  const response = await signedR2Fetch(
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

export async function deleteMediaObject(
  storageKey: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  const response = await signedR2Fetch(
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
