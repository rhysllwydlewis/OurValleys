import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

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
  });

  it("sends HSTS only in production", () => {
    expect(byKey(false)["Strict-Transport-Security"]).toBeUndefined();
    expect(byKey(true)["Strict-Transport-Security"]).toBe("max-age=31536000");
  });
});
