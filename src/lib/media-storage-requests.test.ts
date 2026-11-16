import { createHash, createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const environment = vi.hoisted(() => ({
  current: {} as Record<string, string | undefined>,
}));
vi.mock("@/lib/env", () => ({
  getServerEnvironment: () => environment.current,
}));

import {
  deleteMediaObject,
  getMediaObject,
  objectAddress,
  putMediaObject,
} from "./media-storage";

const railway = {
  MEDIA_S3_ENDPOINT: "https://t3.storageapi.dev",
  MEDIA_S3_BUCKET: "ourvalleys-media",
  MEDIA_S3_ACCESS_KEY_ID: "AKIDEXAMPLE",
  MEDIA_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  NEXT_PUBLIC_SITE_URL: "https://ourvalleys.co.uk",
};
const key =
  "business/0b9d4f3e-6c1a-4c52-9a43-1f7a2d8e5b60/gallery/7d2c9a54-3b1e-4f06-8a97-c5e0d1b2a3f4.png";

type Captured = { url: string; init: RequestInit };

function capture(status = 200) {
  const calls: Captured[] = [];
  const fetchImplementation = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(status === 200 ? "ok" : "no", { status });
  }) as unknown as typeof fetch;
  return { calls, fetchImplementation };
}

const sha256 = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const hmac = (secret: Buffer | string, value: string) =>
  createHmac("sha256", secret).update(value, "utf8").digest();

/**
 * Re-derives the signature from what was actually sent (the URL and headers on
 * the wire), written independently of the signer. A mismatch means the request
 * was signed for a different host or path than it was sent to.
 */
function signatureMatchesRequest(
  { url, init }: Captured,
  secret: string,
  region: string,
): boolean {
  const headers = init.headers as Record<string, string>;
  const parsed = new URL(url);
  const authorization = headers.Authorization!;
  const signedHeaders = /SignedHeaders=([^,]+)/.exec(authorization)![1]!;
  const signature = /Signature=([0-9a-f]+)/.exec(authorization)![1]!;
  const date = headers["x-amz-date"]!;
  const wire: Record<string, string> = {
    host: parsed.host,
    "x-amz-content-sha256": headers["x-amz-content-sha256"]!,
    "x-amz-date": date,
    "content-type": headers["Content-Type"] ?? "",
  };
  const canonicalHeaders = signedHeaders
    .split(";")
    .map((name) => `${name}:${wire[name]}\n`)
    .join("");
  const canonical = [
    init.method,
    parsed.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    headers["x-amz-content-sha256"],
  ].join("\n");
  const scope = `${date.slice(0, 8)}/${region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", date, scope, sha256(canonical)].join(
    "\n",
  );
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secret}`, date.slice(0, 8)), region), "s3"),
    "aws4_request",
  );
  return hmac(signingKey, toSign).toString("hex") === signature;
}

beforeEach(() => {
  environment.current = { ...railway };
});

describe("objectAddress", () => {
  it("puts a virtual-hosted bucket in the host", () => {
    const address = objectAddress(
      {
        endpoint: new URL("https://t3.storageapi.dev"),
        bucket: "ourvalleys-media",
        pathStyle: false,
      },
      "business/a/b.png",
    );
    expect(address).toEqual({
      host: "ourvalleys-media.t3.storageapi.dev",
      path: "/business/a/b.png",
      url: "https://ourvalleys-media.t3.storageapi.dev/business/a/b.png",
    });
  });

  it("puts a path-style bucket in the path", () => {
    const address = objectAddress(
      {
        endpoint: new URL("https://account.r2.cloudflarestorage.com"),
        bucket: "media",
        pathStyle: true,
      },
      "business/a/b.png",
    );
    expect(address.host).toBe("account.r2.cloudflarestorage.com");
    expect(address.url).toBe(
      "https://account.r2.cloudflarestorage.com/media/business/a/b.png",
    );
  });

  it("keeps a custom port in the host that is signed and requested", () => {
    const address = objectAddress(
      {
        endpoint: new URL("http://localhost:9000"),
        bucket: "media",
        pathStyle: true,
      },
      "k.png",
    );
    expect(address.host).toBe("localhost:9000");
    expect(address.url).toBe("http://localhost:9000/media/k.png");
  });

  it("encodes each segment of an unusual key but keeps the slashes", () => {
    expect(
      objectAddress(
        {
          endpoint: new URL("https://s.test"),
          bucket: "b",
          pathStyle: true,
        },
        "a b/c+d.png",
      ).path,
    ).toBe("/b/a%20b/c%2Bd.png");
  });
});

describe("signed requests to a private bucket", () => {
  it("uploads with a signature that matches the request on the wire", async () => {
    const { calls, fetchImplementation } = capture();
    const body = Buffer.from("picture bytes");

    await putMediaObject(key, body, "image/png", fetchImplementation);

    const [call] = calls;
    expect(call!.url).toBe(`https://ourvalleys-media.t3.storageapi.dev/${key}`);
    expect(call!.init.method).toBe("PUT");
    const headers = call!.init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("image/png");
    expect(headers["x-amz-content-sha256"]).toBe(sha256(body));
    expect(headers.Authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
    );
    expect(
      signatureMatchesRequest(
        call!,
        railway.MEDIA_S3_SECRET_ACCESS_KEY,
        "auto",
      ),
    ).toBe(true);
    expect(Buffer.from(call!.init.body as Uint8Array)).toEqual(body);
  });

  it("reads with a signed GET that carries no body or content type", async () => {
    const { calls, fetchImplementation } = capture();

    const response = await getMediaObject(key, fetchImplementation);

    expect(response.status).toBe(200);
    const [call] = calls;
    expect(call!.init.method).toBe("GET");
    expect(call!.init.body).toBeUndefined();
    const headers = call!.init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers["x-amz-content-sha256"]).toBe(sha256(""));
    expect(
      signatureMatchesRequest(
        call!,
        railway.MEDIA_S3_SECRET_ACCESS_KEY,
        "auto",
      ),
    ).toBe(true);
  });

  it("deletes with a signed DELETE and treats a missing object as done", async () => {
    const ok = capture();
    await deleteMediaObject(key, ok.fetchImplementation);
    expect(ok.calls[0]!.init.method).toBe("DELETE");
    expect(
      signatureMatchesRequest(
        ok.calls[0]!,
        railway.MEDIA_S3_SECRET_ACCESS_KEY,
        "auto",
      ),
    ).toBe(true);

    const missing = capture(404);
    await expect(
      deleteMediaObject(key, missing.fetchImplementation),
    ).resolves.toBeUndefined();
  });

  it("gives every request a timeout so a hung bucket is released", async () => {
    const { calls, fetchImplementation } = capture();
    await getMediaObject(key, fetchImplementation);
    await putMediaObject(
      key,
      Buffer.from("x"),
      "image/png",
      fetchImplementation,
    );
    await deleteMediaObject(key, fetchImplementation);
    for (const call of calls) {
      expect(call.init.signal).toBeInstanceOf(AbortSignal);
      expect(call.init.signal?.aborted).toBe(false);
    }
  });

  it("signs with the configured region", async () => {
    environment.current = { ...railway, MEDIA_S3_REGION: "eu-west-1" };
    const { calls, fetchImplementation } = capture();
    await getMediaObject(key, fetchImplementation);
    expect(
      (calls[0]!.init.headers as Record<string, string>).Authorization,
    ).toContain("/eu-west-1/s3/aws4_request");
    expect(
      signatureMatchesRequest(
        calls[0]!,
        railway.MEDIA_S3_SECRET_ACCESS_KEY,
        "eu-west-1",
      ),
    ).toBe(true);
  });

  it("signs path-style requests for the path that is requested", async () => {
    environment.current = { ...railway, MEDIA_S3_PATH_STYLE: "true" };
    const { calls, fetchImplementation } = capture();
    await getMediaObject(key, fetchImplementation);
    expect(calls[0]!.url).toBe(
      `https://t3.storageapi.dev/ourvalleys-media/${key}`,
    );
    expect(
      signatureMatchesRequest(
        calls[0]!,
        railway.MEDIA_S3_SECRET_ACCESS_KEY,
        "auto",
      ),
    ).toBe(true);
  });

  it("still signs Cloudflare R2 requests as before", async () => {
    environment.current = {
      R2_ACCOUNT_ID: "account",
      R2_ACCESS_KEY_ID: "r2-access",
      R2_SECRET_ACCESS_KEY: "r2-secret",
      R2_BUCKET: "r2-media",
      R2_PUBLIC_BASE_URL: "https://media.ourvalleys.co.uk",
    };
    const { calls, fetchImplementation } = capture();
    await putMediaObject(
      key,
      Buffer.from("x"),
      "image/png",
      fetchImplementation,
    );
    expect(calls[0]!.url).toBe(
      `https://account.r2.cloudflarestorage.com/r2-media/${key}`,
    );
    expect(signatureMatchesRequest(calls[0]!, "r2-secret", "auto")).toBe(true);
  });

  it("fails an upload or removal with the status, never the credentials", async () => {
    const failing = capture(500);
    const error = await putMediaObject(
      key,
      Buffer.from("x"),
      "image/png",
      failing.fetchImplementation,
    ).catch((caught: Error) => caught);
    expect((error as Error).message).toBe(
      "Media upload failed with status 500.",
    );
    await expect(
      deleteMediaObject(key, failing.fetchImplementation),
    ).rejects.toThrow("Media removal failed with status 500.");
    expect(String((error as Error).message)).not.toContain(
      railway.MEDIA_S3_SECRET_ACCESS_KEY,
    );
  });

  it("refuses to run without storage configured", async () => {
    environment.current = {};
    const { calls, fetchImplementation } = capture();
    await expect(
      putMediaObject(key, Buffer.from("x"), "image/png", fetchImplementation),
    ).rejects.toThrow("Media storage is not configured.");
    await expect(getMediaObject(key, fetchImplementation)).rejects.toThrow(
      "Media storage is not configured.",
    );
    expect(calls).toHaveLength(0);
  });
});

/**
 * Golden values produced by AWS's own SDK (botocore's S3SigV4Auth) for the
 * identical requests at a pinned time. The signer must match them exactly:
 * this is what shows a real S3-compatible server will accept the signatures,
 * not just that the signer agrees with itself.
 */
describe("signatures match the AWS SDK", () => {
  const secret = "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY";
  const exampleKey =
    "business/0b9d4f3e-6c1a-4c52-9a43-1f7a2d8e5b60/gallery/7d2c9a54-3b1e-4f06-8a97-c5e0d1b2a3f4.png";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T12:00:00.000Z"));
    return () => vi.useRealTimers();
  });

  function authorisation(call: Captured): string {
    return (call.init.headers as Record<string, string>).Authorization!;
  }

  it("a virtual-hosted upload", async () => {
    environment.current = {
      ...railway,
      MEDIA_S3_ACCESS_KEY_ID: "AKIDEXAMPLE",
      MEDIA_S3_SECRET_ACCESS_KEY: secret,
    };
    const { calls, fetchImplementation } = capture();
    await putMediaObject(
      exampleKey,
      Buffer.from("picture bytes"),
      "image/png",
      fetchImplementation,
    );
    expect(authorisation(calls[0]!)).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20261116/auto/s3/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=f36706e273719fe9fbc9bc368469678372ea3ccbc70502288096a0d426eaeeab",
    );
  });

  it("a virtual-hosted read", async () => {
    environment.current = {
      ...railway,
      MEDIA_S3_ACCESS_KEY_ID: "AKIDEXAMPLE",
      MEDIA_S3_SECRET_ACCESS_KEY: secret,
    };
    const { calls, fetchImplementation } = capture();
    await getMediaObject(exampleKey, fetchImplementation);
    expect(authorisation(calls[0]!)).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20261116/auto/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=adc3445894aa1e85fe7e91742922ba3ba407e6ebbec87b09b2c0cd9dda26399a",
    );
  });

  it("a path-style delete in another region", async () => {
    environment.current = {
      ...railway,
      MEDIA_S3_ACCESS_KEY_ID: "AKIDEXAMPLE",
      MEDIA_S3_SECRET_ACCESS_KEY: secret,
      MEDIA_S3_REGION: "eu-west-1",
      MEDIA_S3_PATH_STYLE: "true",
    };
    const { calls, fetchImplementation } = capture();
    await deleteMediaObject(exampleKey, fetchImplementation);
    expect(authorisation(calls[0]!)).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20261116/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=8ed600d99c86c5a393c32409e897041b5afb00a6803b7476563849cf0cad803e",
    );
  });
});
