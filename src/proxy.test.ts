import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: () => {
    throw new Error("public pages must not touch the session");
  },
}));

import { proxy } from "./proxy";

function forwardedLocale(url: string, headers: Record<string, string> = {}) {
  return proxy(new NextRequest(url, { headers })).then((response) =>
    response.headers.get("x-middleware-request-x-ov-locale"),
  );
}

describe("proxy language links", () => {
  it("forwards a valid ?lang= without reading the session or setting a cookie", async () => {
    const response = await proxy(
      new NextRequest("https://example.test/b/cafe?lang=cy"),
    );
    expect(response.headers.get("x-middleware-request-x-ov-locale")).toBe("cy");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("ignores invalid values", async () => {
    expect(await forwardedLocale("https://example.test/?lang=fr")).toBeNull();
  });

  it("drops a client-supplied override header", async () => {
    expect(
      await forwardedLocale("https://example.test/?lang=zz", {
        "x-ov-locale": "cy",
      }),
    ).toBeNull();
  });
});
