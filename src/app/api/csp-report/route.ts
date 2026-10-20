import { formatCspReports } from "@/lib/csp-report";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

/** Receives browser CSP violation reports; always 204 so reports never retry. */
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length <= MAX_BODY_BYTES) {
      for (const line of formatCspReports(JSON.parse(text))) {
        console.warn(JSON.stringify(line));
      }
    }
  } catch {
    // Malformed reports are dropped; this endpoint never reflects input.
  }
  return new Response(null, { status: 204 });
}
