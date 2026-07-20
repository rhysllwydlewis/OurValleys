import "server-only";
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  account,
  session as authSession,
  user,
} from "@/lib/database/schema/auth";

export const accountProvisioningInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(128),
});

export type AccountProvisioningInput = z.infer<
  typeof accountProvisioningInputSchema
>;

export async function provisionEmailPasswordAccount(
  rawInput: AccountProvisioningInput,
): Promise<{ userId: string }> {
  const input = accountProvisioningInputSchema.parse(rawInput);
  const password = await hashPassword(input.password);
  const database = getDatabase();

  return database.transaction(async (transaction) => {
    const [existingUser] = await transaction
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, input.email))
      .limit(1);

    const userId = existingUser
      ? existingUser.id
      : (
          await transaction
            .insert(user)
            .values({
              name: input.name,
              email: input.email,
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
          name: input.name,
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

    await transaction.delete(authSession).where(eq(authSession.userId, userId));
    return { userId };
  });
}
