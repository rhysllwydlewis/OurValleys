import { closeDatabase } from "../src/lib/database/client";
import { publicDemoAccount } from "../src/lib/demo-account";
import { provisionEmailPasswordAccount } from "../src/modules/identity/account-provisioning";

async function provisionDemoAccount() {
  const result = await provisionEmailPasswordAccount({
    email: publicDemoAccount.email,
    name: publicDemoAccount.name,
    password: publicDemoAccount.password,
  });

  if (result.userId !== publicDemoAccount.userId) {
    throw new Error(
      "The public demo account does not match the deterministic seeded user.",
    );
  }

  console.info("Provisioned intentionally public read-only demo access.");
}

provisionDemoAccount()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Demo provisioning failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
