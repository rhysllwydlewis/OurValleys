import { z } from "zod";
import { closeDatabase } from "../src/lib/database/client";
import { provisionEmailPasswordAccount } from "../src/modules/identity/account-provisioning";

const environmentSchema = z.object({
  ACCOUNT_EMAIL: z.string().trim().toLowerCase().email(),
  ACCOUNT_NAME: z.string().trim().min(1).max(120),
  ACCOUNT_PASSWORD: z.string().min(12).max(128),
});

async function provisionAccount() {
  const input = environmentSchema.parse(process.env);
  await provisionEmailPasswordAccount({
    email: input.ACCOUNT_EMAIL,
    name: input.ACCOUNT_NAME,
    password: input.ACCOUNT_PASSWORD,
  });
  console.info("Provisioned email/password access and revoked prior sessions.");
}

provisionAccount()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Account provisioning failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
