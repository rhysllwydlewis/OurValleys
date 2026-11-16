import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { qrPathData } from "@/modules/businesses/qr-code";
import { buildTotpSetupUri, MAX_QR_BYTES } from "./totp-setup-uri";

// Generated fresh on every run, so no credential-shaped value is stored in the
// repository (AGENTS.md: generate disposable test secrets at runtime). It has
// the same length and alphabet as the setup keys Better Auth issues.
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function randomBase32(length: number): string {
  // 256 is a multiple of 32, so taking each byte modulo 32 is unbiased.
  return Array.from(
    randomBytes(length),
    (byte) => BASE32_ALPHABET[byte % 32],
  ).join("");
}
const realisticSecret = randomBase32(52);

describe("buildTotpSetupUri", () => {
  it("builds an otpauth link carrying the secret and issuer", () => {
    expect(buildTotpSetupUri(realisticSecret)).toBe(
      `otpauth://totp/OurValleys?secret=${realisticSecret}&issuer=OurValleys`,
    );
  });

  it("fits the QR generator for a realistic secret", () => {
    const uri = buildTotpSetupUri(realisticSecret)!;
    expect(new TextEncoder().encode(uri).length).toBeLessThanOrEqual(
      MAX_QR_BYTES,
    );
    expect(() => qrPathData(uri)).not.toThrow();
  });

  it("normalises case and surrounding spaces", () => {
    expect(buildTotpSetupUri(` ${realisticSecret.toLowerCase()} `)).toContain(
      `secret=${realisticSecret}&`,
    );
  });

  it("returns null instead of throwing when the secret is too long", () => {
    expect(
      buildTotpSetupUri(`${realisticSecret}${realisticSecret}`),
    ).toBeNull();
  });

  it("returns null for anything that is not a base32 secret", () => {
    expect(buildTotpSetupUri("")).toBeNull();
    expect(buildTotpSetupUri("not a secret!")).toBeNull();
    expect(buildTotpSetupUri("ABC&issuer=evil")).toBeNull();
  });
});
