import { describe, expect, it } from "vitest";
import {
  canUseBusinessAppearanceTools,
  canUseBusinessOperationsTools,
  isPublicDemoEmail,
  publicAdminDemoEmail,
  publicBusinessDemoEmail,
  publicDemoEmails,
  publicViewerDemoEmail,
} from "./public-demo-policy";

describe("isPublicDemoEmail", () => {
  it("recognises every published public demo email", () => {
    for (const email of publicDemoEmails) {
      expect(isPublicDemoEmail(email)).toBe(true);
    }
  });

  it("matches regardless of case or surrounding whitespace", () => {
    expect(isPublicDemoEmail(` ${publicViewerDemoEmail.toUpperCase()} `)).toBe(
      true,
    );
  });

  it("rejects an ordinary account email", () => {
    expect(isPublicDemoEmail("owner@example.com")).toBe(false);
  });

  it("rejects null, undefined and empty input", () => {
    expect(isPublicDemoEmail(null)).toBe(false);
    expect(isPublicDemoEmail(undefined)).toBe(false);
    expect(isPublicDemoEmail("")).toBe(false);
  });
});

describe("canUseBusinessAppearanceTools", () => {
  it("denies appearance tools to public demo accounts", () => {
    expect(canUseBusinessAppearanceTools(publicBusinessDemoEmail)).toBe(false);
  });

  it("allows appearance tools for a real account", () => {
    expect(canUseBusinessAppearanceTools("owner@example.com")).toBe(true);
  });
});

describe("canUseBusinessOperationsTools", () => {
  it("denies operations tools to public demo accounts", () => {
    expect(canUseBusinessOperationsTools(publicAdminDemoEmail)).toBe(false);
  });

  it("allows operations tools for a real account", () => {
    expect(canUseBusinessOperationsTools("owner@example.com")).toBe(true);
  });
});
