import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("blocks after the limit and recovers when the window passes", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 100)).toBe(true);
    expect(limiter.allow("a", 200)).toBe(false);
    expect(limiter.allow("b", 200)).toBe(true);
    expect(limiter.allow("a", 1101)).toBe(true);
  });

  it("evicts the oldest key beyond the key cap", () => {
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 10_000,
      maxKeys: 2,
    });
    limiter.allow("a", 0);
    limiter.allow("b", 1);
    limiter.allow("c", 2);
    expect(limiter.allow("a", 3)).toBe(true);
  });
});
