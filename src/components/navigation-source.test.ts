import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { takeNavigationSource } from "./navigation-source";

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
  return store;
}

describe("takeNavigationSource", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("returns the page just left once, then forgets it", () => {
    const store = stubStorage({
      "ov-nav-from": JSON.stringify({ path: "/map", at: 1_000 }),
    });
    expect(takeNavigationSource(4_000)).toBe("/map");
    expect(store.size).toBe(0);
    expect(takeNavigationSource(4_000)).toBeNull();
  });

  it("ignores a stale record from an earlier visit", () => {
    stubStorage({
      "ov-nav-from": JSON.stringify({ path: "/map", at: 1_000 }),
    });
    expect(takeNavigationSource(60_000)).toBeNull();
  });

  it("ignores malformed or non-path values", () => {
    stubStorage({ "ov-nav-from": "not json" });
    expect(takeNavigationSource()).toBeNull();
    stubStorage({
      "ov-nav-from": JSON.stringify({ path: "https://evil.test", at: 1 }),
    });
    expect(takeNavigationSource(2)).toBeNull();
  });

  it("returns null when storage is unavailable", () => {
    vi.stubGlobal("window", {
      get sessionStorage(): never {
        throw new Error("blocked");
      },
    });
    expect(takeNavigationSource()).toBeNull();
  });
});
