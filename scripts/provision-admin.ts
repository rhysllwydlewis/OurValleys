import { z } from "zod";
import { closeDatabase } from "../src/lib/database/client";
import { grantPlatformAdminRole } from "../src/modules/identity/account-provisioning";

const environmentSchema = z.object({
  ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
});

async function provisionAdmin() {
  const input = environmentSchema.parse(process.env);
  const { email } = await grantPlatformAdminRole({ email: input.ADMIN_EMAIL });
  console.info(`Granted platform-admin role to ${email}.`);
}

provisionAdmin()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Admin provisioning failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
