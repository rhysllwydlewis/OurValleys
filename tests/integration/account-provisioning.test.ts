import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDatabase } from "@/lib/database/client";
import { platformRole } from "@/lib/database/schema/business";
import { getAuth } from "@/lib/auth";
import {
  grantPlatformAdminRole,
  provisionEmailPasswordAccount,
} from "@/modules/identity/account-provisioning";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const uniqueEmail = (suffix: string) =>
  `provision-${suffix}-${Date.now()}-${Math.random().toString(16).slice(2)}@ourvalleys.example`;

const getDatabase = async () => (await import("@/lib/database/client")).getDatabase();

describeDatabase("operator account provisioning", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await closeDatabase();
  });

  it("creates, updates and revokes sessions for an email/password account", async () => {
    const email = uniqueEmail("account");
    const auth = getAuth();
    const database = await getDatabase();
    const deleteSessionSpy = vi.spyOn(auth.api, "deleteUser");

    const created = await provisionEmailPasswordAccount({
      email,
      name: "Initial Operator",
      password: "first-password-value",
    });

    expect(created.created).toBe(true);
    expect(created.email).toBe(email);

    const updated = await provisionEmailPasswordAccount({
      email,
      name: "Updated Operator",
      password: "second-password-value",
    });

    expect(updated).toMatchObject({
      created: false,
      email,
      userId: created.userId,
    });

    const [stored] = await database.query.user.findMany({
      where: (table, { eq }) => eq(table.email, email),
      limit: 1,
      with: { sessions: true },
    });

    expect(stored?.name).toBe("Updated Operator");
    expect(stored?.sessions).toEqual([]);
    expect(deleteSessionSpy).not.toHaveBeenCalled();
  });

  it("grants an active platform administrator role and is repeatable", async () => {
    const email = uniqueEmail("admin");
    const database = await getDatabase();
    const provisioned = await provisionEmailPasswordAccount({
      email,
      name: "Admin Operator",
      password: "admin-password-value",
    });

    const first = await grantPlatformAdminRole({ email });
    const second = await grantPlatformAdminRole({ email });

    expect(first).toEqual({
      email,
      userId: provisioned.userId,
      platformRole: "platform_admin",
    });
    expect(second).toEqual(first);

    const roles = await database
      .select({
        role: platformRole.role,
        status: platformRole.status,
      })
      .from(platformRole);

    expect(roles.filter((record) => record.role === "platform_admin")).toContainEqual({
      role: "platform_admin",
      status: "active",
    });
  });
});
