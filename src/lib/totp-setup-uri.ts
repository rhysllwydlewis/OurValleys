/**
 * The authenticator-app link shown as a QR code during two-step setup.
 *
 * Better Auth's own link also carries the account email and extra parameters,
 * which together exceed what the site's fixed-size QR generator can hold. This
 * shorter link is equally valid: an issuer name and the shared secret are all an
 * authenticator app needs, and the algorithm, digits and period it leaves out
 * default to the values Better Auth uses (SHA-1, 6 digits, 30 seconds).
 *
 * The secret never leaves the browser: the QR is drawn locally, not by a
 * third-party service.
 */

/** The most bytes the site's QR generator can encode. */
export const MAX_QR_BYTES = 106;

const BASE32 = /^[A-Z2-7]+=*$/;

export function buildTotpSetupUri(secret: string): string | null {
  const cleaned = secret.trim().toUpperCase();
  if (!BASE32.test(cleaned)) return null;
  const uri = `otpauth://totp/OurValleys?secret=${cleaned}&issuer=OurValleys`;
  return new TextEncoder().encode(uri).length <= MAX_QR_BYTES ? uri : null;
}
