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
      (await post({ kind: "banner", itemId: crypto.randomUUID() })).status,
    ).toBe(400);
    expect((await post({ kind: "offer", itemId: "not-an-id" })).status).toBe(
      400,
    );
    // A catalogue entry is found through its business, so a slug is required.
    expect(
      (await post({ kind: "catalogue", itemId: crypto.randomUUID() })).status,
    ).toBe(400);
    expect(recordContentView).not.toHaveBeenCalled();
  });

  it("accepts update and catalogue views and passes the slug only for catalogue", async () => {
    const itemId = crypto.randomUUID();
    await post({ kind: "update", itemId, businessSlug: "ignored" });
    expect(recordContentView).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ businessSlug: expect.anything() }),
    );
    await post({ kind: "catalogue", itemId, businessSlug: "cwm-coil-heating" });
    expect(recordContentView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: "catalogue",
        itemId,
        businessSlug: "cwm-coil-heating",
      }),
    );
  });

  it("throttles a client that sends far more than a visitor would", async () => {
    const send = () =>
      POST(
        new Request("http://localhost/api/content-view", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.50", "user-agent": "flood" },
          body: JSON.stringify({ kind: "offer", itemId: crypto.randomUUID() }),
        }),
      );
    let last = 200;
    for (let i = 0; i < 45; i += 1) last = (await send()).status;
    expect(last).toBe(429);
    const other = await post({ kind: "offer", itemId: crypto.randomUUID() });
    expect(other.status).toBe(200);
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
