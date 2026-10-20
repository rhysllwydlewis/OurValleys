import { describe, expect, it } from "vitest";
import { formatRequestError, scrubErrorText } from "./request-error-log";

const now = new Date("2026-10-20T10:00:00.000Z");

describe("formatRequestError", () => {
  it("records the route pattern, type, source, method and digest", () => {
    const error = Object.assign(new TypeError("boom"), { digest: "abc123" });
    const line = formatRequestError(
      error,
      { method: "GET" },
      {
        routePath: "/businesses/[slug]",
        routeType: "render",
        renderSource: "server-rendering",
      },
      now,
    );
    expect(line).toMatchObject({
      level: "error",
      timestamp: "2026-10-20T10:00:00.000Z",
      digest: "abc123",
      route: "/businesses/[slug]",
      routeType: "render",
      renderSource: "server-rendering",
      method: "GET",
      errorName: "TypeError",
      message: "boom",
    });
  });

  it("never carries request URL, headers or cookies", () => {
    const line = formatRequestError(
      new Error("x"),
      {
        method: "POST",
        path: "/a?token=secret",
        headers: { cookie: "s=1" },
      } as never,
      { routePath: "/api/x", routeType: "route" },
      now,
    );
    const text = JSON.stringify(line);
    expect(text).not.toContain("secret");
    expect(text).not.toContain("cookie");
  });

  it("scrubs emails, bearer tokens, long tokens and connection strings", () => {
    const scrubbed = scrubErrorText(
      "failed for jo@example.com with Bearer abc.def-123 key " +
        "a".repeat(40) +
        " at postgres://user:pw@host:5432/db",
    );
    expect(scrubbed).not.toContain("jo@example.com");
    expect(scrubbed).not.toContain("abc.def-123");
    expect(scrubbed).not.toContain("a".repeat(40));
    expect(scrubbed).not.toContain("pw@host");
  });

  it("truncates long messages and stacks", () => {
    const error = new Error("m ".repeat(600));
    error.stack = "s ".repeat(2000);
    const line = formatRequestError(error, { method: "GET" }, {}, now);
    expect(line.message.length).toBeLessThanOrEqual(501);
    expect(line.stack!.length).toBeLessThanOrEqual(2001);
  });

  it("handles non-Error throws without echoing objects", () => {
    expect(
      formatRequestError("plain", { method: "GET" }, {}, now),
    ).toMatchObject({
      errorName: "string",
      message: "plain",
      route: "unknown",
    });
    const line = formatRequestError({ secret: "x" }, {}, {}, now);
    expect(line.message).toBe("Non-error value thrown");
    expect(line.errorName).toBe("object");
    expect(line.digest).toBeUndefined();
  });
});
