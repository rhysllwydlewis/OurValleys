import { describe, expect, it } from "vitest";
import { reportRateLimited, reportThrottleKey } from "./report-throttle";

const headersFor = (ip: string, ua = "agent") =>
  new Headers({ "x-forwarded-for": ip, "user-agent": ua });

describe("report throttle", () => {
  it("allows five reports then throttles an anonymous client", () => {
    const h = headersFor("203.0.113.7");
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) {
      expect(reportRateLimited(h, undefined, now + i)).toBe(false);
    }
    expect(reportRateLimited(h, undefined, now + 10)).toBe(true);
  });

  it("releases the client once the window has passed", () => {
    const h = headersFor("203.0.113.8");
    const now = 5_000_000;
    for (let i = 0; i < 5; i += 1) reportRateLimited(h, undefined, now);
    expect(reportRateLimited(h, undefined, now + 1)).toBe(true);
    expect(reportRateLimited(h, undefined, now + 11 * 60 * 1000)).toBe(false);
  });

  it("keys signed-in users separately from the shared address", () => {
    const h = headersFor("203.0.113.9");
    const now = 9_000_000;
    for (let i = 0; i < 5; i += 1) reportRateLimited(h, undefined, now);
    expect(reportRateLimited(h, undefined, now + 1)).toBe(true);
    expect(reportRateLimited(h, "user-a", now + 1)).toBe(false);
    expect(reportThrottleKey(h, "user-a")).toBe("user:user-a");
  });

  it("never puts the raw address in the key", () => {
    const key = reportThrottleKey(headersFor("203.0.113.10"));
    expect(key).toMatch(/^anon:[0-9a-f]{64}$/);
    expect(key).not.toContain("203.0.113.10");
  });
});
