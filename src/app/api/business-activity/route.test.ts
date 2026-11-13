import { describe, expect, it, vi } from "vitest";

const recordBusinessActivity = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/modules/businesses/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/businesses/analytics")>()),
  recordBusinessActivity,
}));

import { POST } from "./route";

const send = (ip: string, body: unknown = {}) =>
  POST(
    new Request("http://localhost/api/business-activity", {
      method: "POST",
      headers: { "x-forwarded-for": ip, "user-agent": "test" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/business-activity", () => {
  it("rejects an invalid event without recording anything", async () => {
    expect((await send("198.51.100.1", { eventType: "nope" })).status).toBe(
      400,
    );
    expect(recordBusinessActivity).not.toHaveBeenCalled();
  });

  it("records a valid page view", async () => {
    const response = await send("198.51.100.2", {
      businessId: crypto.randomUUID(),
      eventType: "website_view",
      source: "home",
    });
    expect(response.status).toBe(200);
    expect(recordBusinessActivity).toHaveBeenCalledTimes(1);
  });

  it("throttles a client that sends far more than a visitor would", async () => {
    const body = {
      businessId: crypto.randomUUID(),
      eventType: "website_view",
    };
    let last = 200;
    for (let i = 0; i < 125; i += 1)
      last = (await send("203.0.113.77", body)).status;
    expect(last).toBe(429);
    // Another visitor is unaffected.
    expect((await send("203.0.113.78", body)).status).toBe(200);
  });
});
