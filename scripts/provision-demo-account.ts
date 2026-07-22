import { and, eq, ne } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../src/lib/database/client";
import { businessMembership } from "../src/lib/database/schema/business";
import {
  publicAdminDemoAccount,
  publicBusinessDemoAccount,
  publicDemoAccount,
} from "../src/lib/demo-account";
import { permissionsForBusinessRole } from "../src/modules/identity/access-policy";
import {
  grantPlatformAdminRole,
  provisionEmailPasswordAccount,
} from "../src/modules/identity/account-provisioning";

async function grantSingleBusinessDemoOwnership(userId: string) {
  const database = getDatabase();
  const acceptedAt = new Date();
  const permissions = permissionsForBusinessRole("owner");

  await database.transaction(async (transaction) => {
    // This account is intentionally public. Keep its tenant scope exact even if
    // a future fixture accidentally grants it another membership.
    await transaction
      .delete(businessMembership)
      .where(
        and(
          eq(businessMembership.userId, userId),
          ne(
            businessMembership.businessId,
            publicBusinessDemoAccount.businessId,
          ),
        ),
      );

    await transaction
      .insert(businessMembership)
      .values({
        businessId: publicBusinessDemoAccount.businessId,
        userId,
        role: "owner",
        permissions,
        status: "active",
        acceptedAt,
      })
      .onConflictDoUpdate({
        target: [businessMembership.businessId, businessMembership.userId],
        set: {
          role: "owner",
          permissions,
          status: "active",
          acceptedAt,
        },
      });
  });
}

async function provisionDemoAccounts() {
  const viewer = await provisionEmailPasswordAccount({
    email: publicDemoAccount.email,
    name: publicDemoAccount.name,
    password: publicDemoAccount.password,
  });

  if (viewer.userId !== publicDemoAccount.userId) {
    throw new Error(
      "The public viewer account does not match the deterministic seeded user.",
    );
  }

  const businessOwner = await provisionEmailPasswordAccount({
    email: publicBusinessDemoAccount.email,
    name: publicBusinessDemoAccount.name,
    password: publicBusinessDemoAccount.password,
  });
  await grantSingleBusinessDemoOwnership(businessOwner.userId);

  await provisionEmailPasswordAccount({
    email: publicAdminDemoAccount.email,
    name: publicAdminDemoAccount.name,
    password: publicAdminDemoAccount.password,
  });
  await grantPlatformAdminRole({ email: publicAdminDemoAccount.email });

  console.info(
    "Provisioned intentionally public development viewer, single-business owner and admin demos.",
  );
}

provisionDemoAccounts()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Demo provisioning failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
