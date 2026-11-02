export type ResponseHeader = { key: string; value: string };

/**
 * Content-Security-Policy-Report-Only: observe what a real policy would block
 * before enforcing it. Next.js emits inline hydration scripts and this app
 * sets no nonce, so script/style allow 'unsafe-inline' for now; the reports
 * show what else a later enforced policy needs to allow.
 */
export const CSP_REPORT_PATH = "/api/csp-report";

export const REPORT_ONLY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "worker-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  `report-uri ${CSP_REPORT_PATH}`,
].join("; ");

/**
 * Baseline response headers sent on every route in every release stage.
 * HSTS and the report-only policy are production-only: Railway terminates TLS, and local development over
 * plain HTTP must not pin browsers to HTTPS.
 */
export function securityHeaders(options: {
  production: boolean;
}): ResponseHeader[] {
  const headers: ResponseHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(self), payment=()",
    },
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
  if (options.production) {
    headers.push({
      key: "Content-Security-Policy-Report-Only",
      value: REPORT_ONLY_POLICY,
    });
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    });
  }
  return headers;
}
