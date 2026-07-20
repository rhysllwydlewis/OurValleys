import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  closeDatabase,
  getDatabase,
} from "../src/lib/database/client";
import { account, user } from "../src/lib/database/schema/auth";

const provisionInputSchema = z.object({
  ACCOUNT_EMAIL: z.string().trim().toLowerCase().email(),
  ACCOUNT_NAME: z.string().trim().min(1).max(120),
  ACCOUNT_PASSWORD: z.string().min(12).max(128),
});

async function provisionAccount() {
  const input = provisionInputSchema.parse(process.env);
  const password = await hashPassword(input.ACCOUNT_PASSWORD);
  const database = getDatabase();

  await database.transaction(async (transaction) => {
    const [existingUser] = await transaction
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, input.ACCOUNT_EMAIL))
      .limit(1);

    const userId = existingUser
      ? existingUser.id
      : (
          await transaction
            .insert(user)
            .values({
              name: input.ACCOUNT_NAME,
              email: input.ACCOUNT_EMAIL,
              emailVerified: true,
            })
            .returning({ id: user.id })
        )[0]?.id;

    if (!userId) {
      throw new Error("Account provisioning did not return a user identifier.");
    }

    if (existingUser) {
      await transaction
        .update(user)
        .set({
          name: input.ACCOUNT_NAME,
          emailVerified: true,
          updatedAt: sql`now()`,
        })
        .where(eq(user.id, userId));
    }

    await transaction
      .insert(account)
      .values({
        accountId: userId,
        providerId: "credential",
        userId,
        password,
      })
      .onConflictDoUpdate({
        target: [account.providerId, account.accountId],
        set: {
          password,
          updatedAt: sql`now()`,
        },
      });
  });

  console.info(`Provisioned email/password access for ${input.ACCOUNT_EMAIL}.`);
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
