import { createRateLimiter } from "@/lib/rate-limit";
import { hashVisitorSignal } from "@/modules/businesses/analytics";
import type { SubmitReportResult } from "@/modules/moderation/content-reports";

export type ReportActionResult =
  SubmitReportResult | { status: "rate_limited" };

/**
 * One shared allowance for every report form: a client that has sent five
 * reports in ten minutes is told to try again shortly. The module-level
 * open-report cap bounds one target; this bounds how many targets one client
 * can reach. Per server instance, so it blunts scripting rather than being a
 * hard boundary.
 */
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

/**
 * Throttle key: the signed-in user when there is one, otherwise a hash of the
 * forwarded address and user agent. Raw addresses are never stored.
 */
export function reportThrottleKey(
  requestHeaders: Pick<Headers, "get">,
  userId?: string,
): string {
  if (userId) return `user:${userId}`;
  const signal = [
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
    requestHeaders.get("user-agent"),
  ]
    .filter(Boolean)
    .join("|");
  return `anon:${hashVisitorSignal(signal) ?? "unknown"}`;
}

export function reportRateLimited(
  requestHeaders: Pick<Headers, "get">,
  userId?: string,
  now?: number,
): boolean {
  return !limiter.allow(reportThrottleKey(requestHeaders, userId), now);
}
