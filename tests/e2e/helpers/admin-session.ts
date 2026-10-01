import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Platform admins must have two-step verification (OV-204). The ephemeral CI
 * admin is provisioned with a password only, so the first admin journey enrols
 * it through the real settings UI and stores the setup key so later journeys
 * and retries can answer the sign-in challenge.
 */
const secretFile = "test-results/.e2e-admin-totp-key";
const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  let bits = "";
  for (const char of input.replace(/[\s=]+/g, "").toUpperCase()) {
    bits += base32Alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

/** RFC 6238 TOTP (SHA-1, 30s, 6 digits). */
function totp(setupKey: string): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const digest = createHmac("sha1", base32Decode(setupKey))
    .update(counter)
    .digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const value =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;
  return String(value % 1_000_000).padStart(6, "0");
}

function readStoredKey(): string | null {
  try {
    return readFileSync(secretFile, "utf8").trim() || null;
  } catch {
    return null;
  }
}

async function submitDialogSignIn(page: Page, email: string, password: string) {
  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByLabel("Password").fill(password);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  return dialog;
}

async function enrol(page: Page, password: string) {
  await page.goto("/account/settings#two-step");
  const section = page.locator("#two-step");
  await section.getByLabel("Password").fill(password);
  await section
    .getByRole("button", { name: "Set up two-step verification" })
    .click();

  const setupKey = (
    await section.getByLabel("Setup key").textContent({ timeout: 15_000 })
  )?.trim();
  expect(setupKey).toBeTruthy();
  mkdirSync(dirname(secretFile), { recursive: true });
  writeFileSync(secretFile, setupKey!);

  await section.getByLabel("6-digit code").fill(totp(setupKey!));
  await section
    .getByRole("button", { name: "Turn on two-step verification" })
    .click();
  await expect(
    section.getByRole("heading", { name: "Save your recovery codes" }),
  ).toBeVisible();
}

/**
 * Signs the provisioned admin in, enrolling two-step verification if needed.
 * The path is chosen from what sign-in actually does (challenge or straight
 * through), not from the stored key, so a retry after an interrupted enrolment
 * simply enrols again instead of waiting for a challenge that never comes.
 */
export async function signInAsAdmin(
  page: Page,
  email: string,
  password: string,
) {
  const dialog = await submitDialogSignIn(page, email, password);
  const challengeInput = dialog.getByLabel("6-digit authenticator code");

  await Promise.race([
    challengeInput.waitFor({ state: "visible", timeout: 15_000 }),
    page.waitForURL(/\/account$/, { timeout: 15_000 }),
  ]);

  if (await challengeInput.isVisible()) {
    const storedKey = readStoredKey();
    expect(
      storedKey,
      "Sign-in asked for a code but no setup key was stored.",
    ).toBeTruthy();
    await challengeInput.fill(totp(storedKey!));
    await dialog.getByRole("button", { name: "Verify and sign in" }).click();
    await expect(page).toHaveURL(/\/account$/);
    return;
  }

  await expect(page).toHaveURL(/\/account$/);
  await enrol(page, password);
  // A fresh session guarantees the admin layout sees the enrolled state.
  await page.context().clearCookies();
  const challenge = await submitDialogSignIn(page, email, password);
  await challenge
    .getByLabel("6-digit authenticator code")
    .fill(totp(readStoredKey()!));
  await challenge.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
}
