import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../src/lib/database/client";
import { user } from "../src/lib/database/schema/auth";
import { grantPlatformAdminRole } from "../src/modules/identity/account-provisioning";

/**
 * Deploy-time, idempotent and non-fatal: when ADMIN_EMAIL names an account that
 * has registered and verified its email, make it the platform administrator.
 * Does nothing when the variable is unset, the account does not exist yet, the
 * email is unverified (so nobody can claim the address by registering it
 * unverified), or the account is already an administrator (so sessions are not
 * reset on every deploy).
 */
async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.info("ADMIN_EMAIL is not set; skipping administrator grant.");
    return;
  }

  const [existing] = await getDatabase()
    .select({
      role: user.role,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .where(eq(user.email, email));

  if (!existing) {
    console.info(
      "The ADMIN_EMAIL account has not registered yet; skipping administrator grant.",
    );
    return;
  }
  if (!existing.emailVerified) {
    console.info(
      "The ADMIN_EMAIL account has not verified its email yet; skipping administrator grant.",
    );
    return;
  }
  if (existing.role === "admin") {
    console.info("The ADMIN_EMAIL account is already the administrator.");
    return;
  }

  await grantPlatformAdminRole({ email });
  console.info("Granted the platform-admin role to the ADMIN_EMAIL account.");
}

ensureAdmin()
  .catch((error: unknown) => {
    // A failed grant must never block a release.
    console.warn(
      error instanceof Error ? error.message : "Administrator grant failed.",
    );
  })
  .finally(async () => {
    await closeDatabase();
  });
