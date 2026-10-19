export type ResponseHeader = { key: string; value: string };

/**
 * Baseline response headers sent on every route in every release stage.
 * HSTS is production-only: Railway terminates TLS, and local development over
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
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    });
  }
  return headers;
}
