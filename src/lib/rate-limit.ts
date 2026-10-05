/**
 * Small in-memory sliding-window limiter for cheap public read endpoints.
 * State is per server instance, which is enough to blunt scripted hammering of
 * a read-only route; it is not a security boundary for writes.
 */
export type RateLimiter = {
  allow(key: string, now?: number): boolean;
};

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();
  const maxKeys = options.maxKeys ?? 5000;

  return {
    allow(key, now = Date.now()) {
      const windowStart = now - options.windowMs;
      const recent = (hits.get(key) ?? []).filter((at) => at > windowStart);
      if (recent.length >= options.limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.delete(key);
      hits.set(key, recent);
      if (hits.size > maxKeys) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
      return true;
    },
  };
}
