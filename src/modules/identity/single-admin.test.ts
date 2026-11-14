import { describe, expect, it } from "vitest";
import { publicAdminDemoEmail } from "@/lib/public-demo-policy";
import { blocksAdditionalAdmin } from "./single-admin";

const owner = { id: "owner-1", email: "owner@example.com" };
const demoAdmin = { id: "demo-1", email: publicAdminDemoEmail };

describe("blocksAdditionalAdmin", () => {
  it("allows the first private administrator", () => {
    expect(
      blocksAdditionalAdmin([], { id: "u1", email: "a@example.com" }),
    ).toBe(false);
  });

  it("ignores the shared demo admin when counting administrators", () => {
    expect(
      blocksAdditionalAdmin([demoAdmin], { id: "u1", email: "a@example.com" }),
    ).toBe(false);
  });

  it("blocks promoting a second private administrator", () => {
    expect(
      blocksAdditionalAdmin([owner, demoAdmin], {
        id: "u2",
        email: "other@example.com",
      }),
    ).toBe(true);
  });

  it("lets the existing administrator be granted again (idempotent)", () => {
    expect(blocksAdditionalAdmin([owner], owner)).toBe(false);
  });

  it("always allows the demo admin to be provisioned", () => {
    expect(blocksAdditionalAdmin([owner], demoAdmin)).toBe(false);
  });
});
