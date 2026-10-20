import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => vi.restoreAllMocks());

const post = (body: string) =>
  POST(
    new Request("https://ourvalleys.test/api/csp-report", {
      method: "POST",
      body,
    }),
  );

describe("POST /api/csp-report", () => {
  it("logs one line per violation and returns 204", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await post(
      JSON.stringify({
        "csp-report": {
          "effective-directive": "img-src",
          "blocked-uri": "https://cdn.example/x.png",
          "document-uri": "https://ourvalleys.test/",
        },
      }),
    );
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("drops malformed and oversized bodies silently", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await post("{not json")).status).toBe(204);
    expect((await post(" ".repeat(20000) + "{}")).status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });

  it("rejects an oversized Content-Length without reading the body", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await POST(
      new Request("https://ourvalleys.test/api/csp-report", {
        method: "POST",
        headers: { "content-length": "999999", "x-forwarded-for": "9.9.9.1" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });

  it("stops logging once a client exceeds the rate limit", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const body = JSON.stringify({
      "csp-report": { "effective-directive": "img-src" },
    });
    for (let i = 0; i < 40; i++) {
      const res = await POST(
        new Request("https://ourvalleys.test/api/csp-report", {
          method: "POST",
          headers: { "x-forwarded-for": "9.9.9.2" },
          body,
        }),
      );
      expect(res.status).toBe(204);
    }
    expect(warn).toHaveBeenCalledTimes(30);
  });
});
