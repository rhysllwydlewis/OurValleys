import { describe, expect, it } from "vitest";
import { qrPathData } from "@/modules/businesses/qr-code";
import { buildTotpSetupUri, MAX_QR_BYTES } from "./totp-setup-uri";

// A patterned, made-up value with the same length and alphabet as the keys
// Better Auth issues. Deliberately not random-looking: it must never resemble
// (or be) a real account secret.
const realisticSecret = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(2);

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
