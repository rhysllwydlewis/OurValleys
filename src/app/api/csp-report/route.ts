import { formatCspReports } from "@/lib/csp-report";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

// Reports are best-effort telemetry: over the limit they are dropped, not logged,
// so a POST loop cannot flood stdout shared with request_error lines.
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

/** Reads the body, giving up once more than `maxBytes` have arrived. */
async function readCapped(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Receives browser CSP violation reports; always 204 so reports never retry. */
export async function POST(request: Request) {
  try {
    if (limiter.allow(clientKey(request))) {
      const text = await readCapped(request, MAX_BODY_BYTES);
      if (text !== null) {
        for (const line of formatCspReports(JSON.parse(text))) {
          console.warn(JSON.stringify(line));
        }
      }
    }
  } catch {
    // Malformed reports are dropped; this endpoint never reflects input.
  }
  return new Response(null, { status: 204 });
}
