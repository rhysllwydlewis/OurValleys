import { beforeEach, describe, expect, it, vi } from "vitest";

const listSearchSuggestions = vi.fn();
vi.mock("@/modules/businesses/search-suggestions", () => ({
  listSearchSuggestions: (q: string | null) => listSearchSuggestions(q),
}));

import { GET } from "./route";

function request(query: string, ip = "203.0.113.1") {
  return new Request(`https://example.test/api/search/suggest${query}`, {
    headers: { "x-forwarded-for": ip },
  });
}

describe("GET /api/search/suggest", () => {
  beforeEach(() => listSearchSuggestions.mockReset());

  it("returns suggestions with a short public cache", async () => {
    listSearchSuggestions.mockResolvedValue([
      { kind: "business", label: "Cwm Bakery", href: "/b/cwm-bakery" },
    ]);
    const response = await GET(request("?q=bake"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("max-age=30");
    expect((await response.json()).suggestions).toHaveLength(1);
    expect(listSearchSuggestions).toHaveBeenCalledWith("bake");
  });

  it("passes a missing query through so the module answers empty", async () => {
    listSearchSuggestions.mockResolvedValue([]);
    const response = await GET(request(""));
    expect(await response.json()).toEqual({ suggestions: [] });
    expect(listSearchSuggestions).toHaveBeenCalledWith(null);
  });

  it("rate limits a client that floods the endpoint", async () => {
    listSearchSuggestions.mockResolvedValue([]);
    let last = 200;
    for (let i = 0; i < 61; i += 1) {
      last = (await GET(request("?q=ab", "198.51.100.9"))).status;
    }
    expect(last).toBe(429);
    expect((await GET(request("?q=ab", "198.51.100.10"))).status).toBe(200);
  });
});
