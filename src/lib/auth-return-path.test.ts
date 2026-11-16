import { describe, expect, it } from "vitest";
import {
  ADMIN_HOME_PATH,
  DEFAULT_AUTH_RETURN_PATH,
  getPostSignInPath,
  getSafeAuthReturnPath,
  withAuthReturnPath,
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
    "/account\0unexpected",
    "/login",
    "/login?next=/account",
  ])("rejects an unsafe or looping return path: %s", (value) => {
    expect(getSafeAuthReturnPath(value)).toBe(DEFAULT_AUTH_RETURN_PATH);
  });
});

describe("withAuthReturnPath", () => {
  it("keeps a safe non-default return path on the target page", () => {
    expect(withAuthReturnPath("/login", "/claim/cwm?x=1")).toBe(
      "/login?next=%2Fclaim%2Fcwm%3Fx%3D1",
    );
  });

  it("omits the parameter when absent, default or unsafe", () => {
    expect(withAuthReturnPath("/register", undefined)).toBe("/register");
    expect(withAuthReturnPath("/register", "/account")).toBe("/register");
    expect(withAuthReturnPath("/register", "//evil.example")).toBe("/register");
    expect(withAuthReturnPath("/forgot-password", "/login")).toBe(
      "/forgot-password",
    );
  });
});

describe("getPostSignInPath", () => {
  it("sends the platform admin to the admin area when no page was asked for", () => {
    expect(getPostSignInPath(undefined, "admin")).toBe(ADMIN_HOME_PATH);
    expect(getPostSignInPath("/login", "admin")).toBe(ADMIN_HOME_PATH);
  });

  it("sends everyone else to their account", () => {
    expect(getPostSignInPath(undefined, "user")).toBe(DEFAULT_AUTH_RETURN_PATH);
    expect(getPostSignInPath(undefined, null)).toBe(DEFAULT_AUTH_RETURN_PATH);
    expect(getPostSignInPath(undefined, undefined)).toBe(
      DEFAULT_AUTH_RETURN_PATH,
    );
  });

  it("keeps a specific page for the admin, such as two-step setup", () => {
    expect(getPostSignInPath("/account/settings#two-step", "admin")).toBe(
      "/account/settings#two-step",
    );
    expect(getPostSignInPath("/admin/users", "admin")).toBe("/admin/users");
  });

  it("never lets an unsafe address through, for any role", () => {
    expect(getPostSignInPath("https://example.com/", "admin")).toBe(
      ADMIN_HOME_PATH,
    );
    expect(getPostSignInPath("//example.com/", "user")).toBe(
      DEFAULT_AUTH_RETURN_PATH,
    );
  });
});
