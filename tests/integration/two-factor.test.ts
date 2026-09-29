import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { getAuth } from "@/lib/auth";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { adminAuditLog, user } from "@/lib/database/schema";
import { GET as authRouteGET } from "@/app/api/auth/[...all]/route";
import { provisionEmailPasswordAccount } from "@/modules/identity/account-provisioning";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixtureEmail = "fixture-two-factor-admin@example.test";
const fixturePassword = "fixture-two-factor-password";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  let bits = "";
  for (const char of input.replace(/=+$/, "").toUpperCase()) {
    bits += base32Alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

/** RFC 6238 TOTP (SHA-1, 30s, 6 digits) computed independently of the app. */
function totpFromUri(uri: string): string {
  const secret = base32Decode(new URL(uri).searchParams.get("secret") ?? "");
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const digest = createHmac("sha1", secret).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const value =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;
  return String(value % 1_000_000).padStart(6, "0");
}

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function signIn() {
  const response = await getAuth().api.signInEmail({
    body: { email: fixtureEmail, password: fixturePassword },
    asResponse: true,
  });
  return response;
}

describeDatabase("admin two-step verification", () => {
  afterEach(async () => {
    await getDatabase().delete(user).where(eq(user.email, fixtureEmail));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("enrols, challenges at sign-in and records audit events", async () => {
    const { userId } = await provisionEmailPasswordAccount({
      email: fixtureEmail,
      name: "Fixture Two Factor Admin",
      password: fixturePassword,
    });
    await getDatabase()
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.id, userId));

    const auth = getAuth();
    const first = await signIn();
    const headers = new Headers({ cookie: cookieHeader(first) });

    // A wrong password must not start enrolment.
    await expect(
      auth.api.enableTwoFactor({
        body: { password: "wrong-password" },
        headers,
      }),
    ).rejects.toThrow();

    const enrolment = await auth.api.enableTwoFactor({
      body: { password: fixturePassword },
      headers,
    });
    expect(enrolment.backupCodes.length).toBeGreaterThan(0);

    // Not enabled until the first code is verified.
    const [pending] = await getDatabase()
      .select()
      .from(user)
      .where(eq(user.id, userId));
    expect(pending?.twoFactorEnabled).toBe(false);

    await expect(
      auth.api.verifyTOTP({ body: { code: "000000" }, headers }),
    ).rejects.toThrow();

    await auth.api.verifyTOTP({
      body: { code: totpFromUri(enrolment.totpURI) },
      headers,
    });

    const [enabled] = await getDatabase()
      .select()
      .from(user)
      .where(eq(user.id, userId));
    expect(enabled?.twoFactorEnabled).toBe(true);

    // The next password sign-in is challenged instead of granting a session.
    const challenged = await signIn();
    const body = (await challenged.json()) as { twoFactorRedirect?: boolean };
    expect(body.twoFactorRedirect).toBe(true);
    const challengeHeaders = new Headers({ cookie: cookieHeader(challenged) });
    await expect(
      auth.api.getSession({ headers: challengeHeaders }),
    ).resolves.toBeNull();

    await expect(
      auth.api.verifyBackupCode({
        body: { code: "not-a-real-code" },
        headers: challengeHeaders,
      }),
    ).rejects.toThrow();
    const verified = await auth.api.verifyBackupCode({
      body: { code: enrolment.backupCodes[0]! },
      headers: challengeHeaders,
      asResponse: true,
    });
    expect(verified.ok).toBe(true);

    const events = await getDatabase()
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.actorUserId, userId));
    expect(events.map((event) => event.action)).toContain(
      "auth.two_factor_enabled",
    );
  });

  it("refuses Better Auth admin endpoints to an unenrolled admin and revokes older sessions on enrolment", async () => {
    const { userId } = await provisionEmailPasswordAccount({
      email: fixtureEmail,
      name: "Fixture Two Factor Admin",
      password: fixturePassword,
    });
    await getDatabase()
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.id, userId));

    const auth = getAuth();
    const listUsers = (headers: Headers) =>
      authRouteGET(
        new Request("http://localhost:3000/api/auth/admin/list-users?limit=1", {
          headers,
        }),
      );

    const older = new Headers({ cookie: cookieHeader(await signIn()) });
    const enrolling = new Headers({ cookie: cookieHeader(await signIn()) });

    // Unenrolled admin: role alone must not open the catch-all admin API.
    expect((await listUsers(older)).status).toBe(403);

    const enrolment = await auth.api.enableTwoFactor({
      body: { password: fixturePassword },
      headers: enrolling,
    });
    const verified = await auth.api.verifyTOTP({
      body: { code: totpFromUri(enrolment.totpURI) },
      headers: enrolling,
      asResponse: true,
    });
    expect(verified.ok).toBe(true);
    const fresh = new Headers({ cookie: cookieHeader(verified) });

    // Every session issued before the factor was proven is gone...
    await expect(auth.api.getSession({ headers: older })).resolves.toBeNull();
    await expect(
      auth.api.getSession({ headers: enrolling }),
    ).resolves.toBeNull();
    expect((await listUsers(older)).status).not.toBe(200);
    // ...and only the session that completed verification reaches the API.
    expect((await listUsers(fresh)).status).toBe(200);
  });
});
