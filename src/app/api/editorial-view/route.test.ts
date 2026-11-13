import { describe, expect, it, vi } from "vitest";

const recordEditorialView = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/modules/platform/editorial-insights", () => ({
  recordEditorialView,
}));

import { POST } from "./route";

const post = (body: unknown, raw = false) =>
  POST(
    new Request("http://localhost/api/editorial-view", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.9", "user-agent": "test" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );

describe("POST /api/editorial-view", () => {
  it("rejects malformed JSON, unknown kinds and non-UUID ids", async () => {
    expect((await post("{", true)).status).toBe(400);
    expect(
      (await post({ kind: "offer", itemId: crypto.randomUUID() })).status,
    ).toBe(400);
    expect((await post({ kind: "guide", itemId: "not-an-id" })).status).toBe(
      400,
    );
    expect(recordEditorialView).not.toHaveBeenCalled();
  });

  it("passes only the kind, id and source, never a client-supplied visitor", async () => {
    const itemId = crypto.randomUUID();
    const response = await post({
      kind: "place",
      itemId,
      source: "home",
      visitorSignal: "forged",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: true });
    expect(recordEditorialView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: "place",
        itemId,
        source: "home",
        visitorSignal: "198.51.100.9|test",
      }),
    );
  });

  it("reports an item that is not counted without an error", async () => {
    recordEditorialView.mockResolvedValueOnce(false);
    const response = await post({ kind: "story", itemId: crypto.randomUUID() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: false });
  });

  it("throttles a client that sends far more than a visitor would", async () => {
    const send = () =>
      POST(
        new Request("http://localhost/api/editorial-view", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.50", "user-agent": "flood" },
          body: JSON.stringify({ kind: "guide", itemId: crypto.randomUUID() }),
        }),
      );
    let last = 200;
    for (let i = 0; i < 45; i += 1) last = (await send()).status;
    expect(last).toBe(429);
    expect((await send()).headers.get("Retry-After")).toBe("60");
  });
});
