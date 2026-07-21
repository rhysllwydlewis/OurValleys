import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins/admin";
import { getDatabase } from "@/lib/database/client";
import * as authSchema from "@/lib/database/schema/auth";
import { isRegistrationOpen, sendTransactionalEmail } from "@/lib/email";
import { getServerEnvironment } from "@/lib/env";
import { resolveTrustedOrigins } from "@/lib/runtime-configuration";

function createAuth() {
  const environment = getServerEnvironment();

  return betterAuth({
    appName: "OurValleys",
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    trustedOrigins: resolveTrustedOrigins(process.env),
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: authSchema,
    }),
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    emailAndPassword: {
      enabled: true,
      // Public sign-up stays closed whenever a verification email cannot be
      // delivered, so no account can be created that is unable to verify.
      disableSignUp: !isRegistrationOpen(),
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendTransactionalEmail({
          to: user.email,
          subject: "Reset your OurValleys password",
          text: [
            `Hello ${user.name},`,
            "",
            "A password reset was requested for your OurValleys account.",
            "Select the link below within one hour to choose a new password:",
            "",
            url,
            "",
            "If you did not request this, you can safely ignore this email.",
          ].join("\n"),
        });
      },
      resetPasswordTokenExpiresIn: 60 * 60,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await sendTransactionalEmail({
          to: user.email,
          subject: "Verify your email for OurValleys",
          text: [
            `Hello ${user.name},`,
            "",
            "Confirm this email address to unlock your OurValleys account.",
            "The link below is valid for 24 hours:",
            "",
            url,
            "",
            "If you did not create an OurValleys account, you can safely",
            "ignore this email and no account will be activated.",
          ].join("\n"),
        });
      },
    },
    user: {
      additionalFields: {
        marketingOptIn: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: true,
        },
      },
      deleteUser: {
        enabled: true,
      },
    },
    // nextCookies() must stay last so it can intercept Set-Cookie headers
    // from every other plugin's endpoints when called from server actions.
    plugins: [adminPlugin(), nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let authInstance: Auth | undefined;

export function getAuth(): Auth {
  authInstance ??= createAuth();
  return authInstance;
}
