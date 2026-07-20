import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTH_RETURN_PATH,
  getSafeAuthReturnPath,
} from "@/lib/auth-return-path";

describe("authentication return paths", () => {
  it("keeps a local path, query and fragment", () => {
    expect(getSafeAuthReturnPath("/businesses?q=coffee#results")).toBe(
      "/businesses?q=coffee#results",
    );
  });

  it("uses the first value when the query is repeated", () => {
    expect(getSafeAuthReturnPath(["/account", "/businesses"])).toBe("/account");
  });

  it.each([
    undefined,
    null,
    "",
    "https://example.com/account",
    "//example.com/account",
    "/\\example.com/account",
    "/login",
    "/login?next=/account",
  ])("rejects an unsafe or looping return path: %s", (value) => {
    expect(getSafeAuthReturnPath(value)).toBe(DEFAULT_AUTH_RETURN_PATH);
  });
});
