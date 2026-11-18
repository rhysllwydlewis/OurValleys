import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const file = readFileSync(
  new URL("../../public/.well-known/security.txt", import.meta.url),
  "utf8",
);
const field = (name: string): string | undefined =>
  new RegExp(`^${name}:\\s*(.+)$`, "m").exec(file)?.[1]?.trim();

describe("security.txt (RFC 9116)", () => {
  it("names a contact that is a web address or mailbox the owner controls", () => {
    // The route is the vexi.co.uk contact form, as the policies say.
    expect(field("Contact")).toMatch(/^(https:\/\/|mailto:)/);
    expect(file).toContain("https://vexi.co.uk/");
  });

  it("is canonical to the site's own address", () => {
    expect(field("Canonical")).toBe(
      "https://ourvalleys.co.uk/.well-known/security.txt",
    );
  });

  it("has an expiry that is in the future, and a year at most away", () => {
    const expires = new Date(field("Expires") ?? "");
    expect(Number.isNaN(expires.getTime())).toBe(false);
    const days = (expires.getTime() - Date.now()) / 86_400_000;
    // Fails 60 days before it lapses, so it is renewed in good time.
    expect(days, "renew security.txt before it expires").toBeGreaterThan(60);
    expect(days).toBeLessThan(366);
  });
});
