import { describe, expect, it, vi } from "vitest";

const recordContentView = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/modules/businesses/content-insights", () => ({ recordContentView }));

import { POST } from "./route";

const post = (body: unknown, raw = false) =>
  POST(
    new Request("http://localhost/api/content-view", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.9", "user-agent": "test" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );

describe("POST /api/content-view", () => {
  it("rejects malformed JSON, unknown kinds and non-UUID ids", async () => {
    expect((await post("{", true)).status).toBe(400);
    expect(
      (await post({ kind: "update", itemId: crypto.randomUUID() })).status,
    ).toBe(400);
    expect((await post({ kind: "offer", itemId: "not-an-id" })).status).toBe(
      400,
    );
    expect(recordContentView).not.toHaveBeenCalled();
  });

  it("passes only the kind, item and a normalised source, never a business id", async () => {
    const itemId = crypto.randomUUID();
    const response = await post({
      kind: "event",
      itemId,
      source: "https://evil.example/<script>",
      businessId: crypto.randomUUID(),
    });
    expect(await response.json()).toEqual({ accepted: true });
    expect(recordContentView).toHaveBeenCalledWith({
      kind: "event",
      itemId,
      source: "other_site",
      visitorSignal: "198.51.100.9|test",
    });
  });
});
