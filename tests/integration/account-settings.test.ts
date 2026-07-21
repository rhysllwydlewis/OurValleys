import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { getAuth } from "@/lib/auth";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { session as authSession, user } from "@/lib/database/schema/auth";
import { provisionEmailPasswordAccount } from "@/modules/identity/account-provisioning";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixtureEmail = "fixture-account-settings@example.test";
const fixturePassword = "fixture-account-settings-password";

async function provisionFixtureAndSignIn() {
  const { userId } = await provisionEmailPasswordAccount({
    email: fixtureEmail,
    name: "Fixture Settings User",
    password: fixturePassword,
  });

  const auth = getAuth();
  const signInResponse = await auth.api.signInEmail({
    body: { email: fixtureEmail, password: fixturePassword },
    asResponse: true,
  });
  const cookieHeader = signInResponse.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

  return { auth, userId, headers: new Headers({ cookie: cookieHeader }) };
}

describeDatabase("account settings", () => {
  afterEach(async () => {
    const database = getDatabase();
    await database.delete(user).where(eq(user.email, fixtureEmail));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("updates the profile name and photo", async () => {
    const { auth, headers } = await provisionFixtureAndSignIn();

    await auth.api.updateUser({
      body: {
        name: "Updated Fixture Name",
        image: "https://example.test/a.jpg",
      },
      headers,
    });

    const [row] = await getDatabase()
      .select()
      .from(user)
      .where(eq(user.email, fixtureEmail))
      .limit(1);

    expect(row?.name).toBe("Updated Fixture Name");
    expect(row?.image).toBe("https://example.test/a.jpg");
  });

  it("updates the marketing preference", async () => {
    const { auth, headers } = await provisionFixtureAndSignIn();

    await auth.api.updateUser({
      body: { marketingOptIn: true } as Record<string, unknown>,
      headers,
    });

    const [row] = await getDatabase()
      .select()
      .from(user)
      .where(eq(user.email, fixtureEmail))
      .limit(1);

    expect(row?.marketingOptIn).toBe(true);
  });

  it("refuses to delete the account with the wrong password", async () => {
    const { auth, headers } = await provisionFixtureAndSignIn();

    await expect(
      auth.api.deleteUser({
        body: { password: "definitely-the-wrong-password" },
        headers,
      }),
    ).rejects.toMatchObject({ body: { code: "INVALID_PASSWORD" } });

    const [row] = await getDatabase()
      .select()
      .from(user)
      .where(eq(user.email, fixtureEmail))
      .limit(1);
    expect(row).toBeDefined();
  });

  it("deletes the account and its sessions with the correct password", async () => {
    const { auth, userId, headers } = await provisionFixtureAndSignIn();

    const result = await auth.api.deleteUser({
      body: { password: fixturePassword },
      headers,
    });
    expect(result.success).toBe(true);

    const [row] = await getDatabase()
      .select()
      .from(user)
      .where(eq(user.email, fixtureEmail))
      .limit(1);
    expect(row).toBeUndefined();

    const remainingSessions = await getDatabase()
      .select()
      .from(authSession)
      .where(eq(authSession.userId, userId));
    expect(remainingSessions).toHaveLength(0);
  });
});
