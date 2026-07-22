import { closeDatabase } from "../src/lib/database/client";
import {
  publicAdminDemoAccount,
  publicBusinessDemoAccount,
  publicDemoAccount,
} from "../src/lib/demo-account";
import {
  grantPlatformAdminRole,
  provisionEmailPasswordAccount,
} from "../src/modules/identity/account-provisioning";

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

  if (businessOwner.userId !== publicBusinessDemoAccount.userId) {
    throw new Error(
      "The public business account does not match the deterministic seeded owner.",
    );
  }

  await provisionEmailPasswordAccount({
    email: publicAdminDemoAccount.email,
    name: publicAdminDemoAccount.name,
    password: publicAdminDemoAccount.password,
  });
  await grantPlatformAdminRole({ email: publicAdminDemoAccount.email });

  console.info(
    "Provisioned intentionally public development viewer, business and admin demos.",
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
