import { describe, expect, it } from "vitest";
import { CSP_REPORT_PATH, securityHeaders } from "./security-headers";

const byKey = (production: boolean) =>
  Object.fromEntries(
    securityHeaders({ production }).map((h) => [h.key, h.value]),
  );

describe("securityHeaders", () => {
  it("always blocks framing, sniffing and leaky referrers", () => {
    const headers = byKey(false);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toBe("frame-ancestors 'none'");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    // Near-me and the valleys map use the visitor's position in the browser.
    expect(headers["Permissions-Policy"]).toContain("geolocation=(self)");
  });

  it("sends HSTS only in production", () => {
    expect(byKey(false)["Strict-Transport-Security"]).toBeUndefined();
    expect(byKey(true)["Strict-Transport-Security"]).toBe("max-age=31536000");
  });

  it("sends the report-only policy in production, pointing at the report endpoint", () => {
    expect(byKey(false)["Content-Security-Policy-Report-Only"]).toBeUndefined();
    const policy = byKey(true)["Content-Security-Policy-Report-Only"];
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain(`report-uri ${CSP_REPORT_PATH}`);
    // The enforced header stays frame-ancestors only until reports look clean.
    expect(byKey(true)["Content-Security-Policy"]).toBe(
      "frame-ancestors 'none'",
    );
  });
});
