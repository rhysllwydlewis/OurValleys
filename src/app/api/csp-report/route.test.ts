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
});
