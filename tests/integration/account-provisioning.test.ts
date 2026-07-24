import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import {
  account,
  session as authSession,
  user,
} from "@/lib/database/schema/auth";
import {
  accountProvisioningInputSchema,
  grantPlatformAdminRole,
  provisionEmailPasswordAccount,
} from "@/modules/identity/account-provisioning";

describe("accountProvisioningInputSchema", () => {
  it("rejects a password shorter than the minimum length", () => {
    expect(() =>
      accountProvisioningInputSchema.parse({
        email: "fixture-provisioning@example.test",
        name: "Fixture Owner",
        password: "too-short",
      }),
    ).toThrow();
  });

  it("rejects an invalid email address", () => {
    expect(() =>
      accountProvisioningInputSchema.parse({
        email: "not-an-email",
        name: "Fixture Owner",
        password: "a-sufficiently-long-password",
      }),
    ).toThrow();
  });

  it("normalises the email to lowercase and trims surrounding whitespace", () => {
    const result = accountProvisioningInputSchema.parse({
      email: "  Fixture-Provisioning@Example.Test  ",
      name: "  Fixture Owner  ",
      password: "a-sufficiently-long-password",
    });
    expect(result.email).toBe("fixture-provisioning@example.test");
    expect(result.name).toBe("Fixture Owner");
  });
});

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixtureEmail = "fixture-account-provisioning@example.test";
const missingEmail = "fixture-account-provisioning-missing@example.test";

describeDatabase("provisionEmailPasswordAccount", () => {
  afterEach(async () => {
    const database = getDatabase();
    const [existing] = await database
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, fixtureEmail));
    if (existing) {
      await database
        .delete(authSession)
        .where(eq(authSession.userId, existing.id));
      await database.delete(account).where(eq(account.userId, existing.id));
      await database.delete(user).where(eq(user.id, existing.id));
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("creates a new user and a credential account", async () => {
    const result = await provisionEmailPasswordAccount({
      email: fixtureEmail,
      name: "Fixture Owner",
      password: "a-sufficiently-long-password",
    });

    const database = getDatabase();
    const [createdUser] = await database
      .select({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      })
      .from(user)
      .where(eq(user.id, result.userId));
    expect(createdUser).toMatchObject({
      name: "Fixture Owner",
      email: fixtureEmail,
      emailVerified: true,
    });

    const [createdAccount] = await database
      .select({ providerId: account.providerId, password: account.password })
      .from(account)
      .where(eq(account.userId, result.userId));
    expect(createdAccount?.providerId).toBe("credential");
    expect(createdAccount?.password).toBeTruthy();
    expect(createdAccount?.password).not.toBe("a-sufficiently-long-password");
  });

  it("updates the existing account and clears sessions when re-provisioned", async () => {
    const first = await provisionEmailPasswordAccount({
      email: fixtureEmail,
      name: "Fixture Owner",
      password: "a-sufficiently-long-password",
    });

    const database = getDatabase();
    await database.insert(authSession).values({
      token: "fixture-account-provisioning-session-token",
      userId: first.userId,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const second = await provisionEmailPasswordAccount({
      email: fixtureEmail,
      name: "Fixture Owner Renamed",
      password: "a-different-sufficiently-long-password",
    });
    expect(second.userId).toBe(first.userId);

    const [updatedUser] = await database
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, first.userId));
    expect(updatedUser?.name).toBe("Fixture Owner Renamed");

    const remainingSessions = await database
      .select({ id: authSession.id })
      .from(authSession)
      .where(eq(authSession.userId, first.userId));
    expect(remainingSessions).toHaveLength(0);
  });
});

describeDatabase("grantPlatformAdminRole", () => {
  afterEach(async () => {
    const database = getDatabase();
    await database.delete(user).where(eq(user.email, fixtureEmail));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("grants the admin role to an existing account", async () => {
    const database = getDatabase();
    await database.insert(user).values({
      name: "Fixture Grant Target",
      email: fixtureEmail,
    });

    const result = await grantPlatformAdminRole({ email: fixtureEmail });
    expect(result.email).toBe(fixtureEmail);

    const [row] = await database
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, result.userId));
    expect(row?.role).toBe("admin");
  });

  it("throws a clear error when no account matches the email", async () => {
    await expect(
      grantPlatformAdminRole({ email: missingEmail }),
    ).rejects.toThrow(/No account found/);
  });
});
