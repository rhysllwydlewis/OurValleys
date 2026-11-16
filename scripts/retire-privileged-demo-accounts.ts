/**
 * Retires the two privileged public demo identities (business owner and
 * platform administrator) before public release.
 *
 *   pnpm auth:retire-demos             dry run: prints the evidence, changes nothing
 *   pnpm auth:retire-demos --confirm   deletes both identities in one transaction
 *
 * Deleting an `auth_user` row removes its sessions, credentials and business
 * memberships (cascading foreign keys), so every active session ends at once.
 * Rows that merely record who did something (the audit log, review and
 * moderation authorship) keep their content and lose the link to the person.
 *
 * What it will not do: touch any other account, touch the read-only viewer, or
 * run against the account named by ADMIN_EMAIL. The same transaction records an
 * audit entry holding the evidence, and the evidence is printed so it can be
 * kept with the release record.
 *
 * Redeploying while OURVALLEYS_RELEASE_STAGE is not `public` provisions the two
 * identities again, so retire them in the same window in which the stage moves
 * to `public`.
 */
import { eq, inArray, sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../src/lib/database/client";
import {
  account as authAccount,
  session as authSession,
  user,
} from "../src/lib/database/schema/auth";
import { businessMembership } from "../src/lib/database/schema/business";
import { adminAuditLog } from "../src/lib/database/schema/moderation";
import {
  publicAdminDemoAccount,
  publicBusinessDemoAccount,
} from "../src/lib/demo-account";

export const retiredDemoEmails = [
  publicBusinessDemoAccount.email,
  publicAdminDemoAccount.email,
] as const;

export const retirementAuditAction = "release.privileged_demos_retired";

export type DemoIdentityEvidence = {
  email: string;
  userId: string;
  role: string;
  createdAt: string;
  sessions: number;
  credentials: number;
  memberships: number;
};

export type RetirementReport = {
  mode: "dry-run" | "confirmed";
  checkedAt: string;
  found: DemoIdentityEvidence[];
  absent: string[];
  remainingAfter: number | null;
};

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function collectEvidence(
  database: Database | Transaction,
  emails: readonly string[],
): Promise<{ found: DemoIdentityEvidence[]; absent: string[] }> {
  const rows = await database
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(inArray(user.email, [...emails]));

  const found: DemoIdentityEvidence[] = [];
  for (const row of rows) {
    const [sessions] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(authSession)
      .where(eq(authSession.userId, row.id));
    const [credentials] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(authAccount)
      .where(eq(authAccount.userId, row.id));
    const [memberships] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(businessMembership)
      .where(eq(businessMembership.userId, row.id));
    found.push({
      email: row.email,
      userId: row.id,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      sessions: sessions?.count ?? 0,
      credentials: credentials?.count ?? 0,
      memberships: memberships?.count ?? 0,
    });
  }

  const present = new Set(found.map((entry) => entry.email));
  return {
    found,
    absent: emails.filter((email) => !present.has(email)),
  };
}

export async function retirePrivilegedDemoAccounts(options: {
  confirm: boolean;
  adminEmail?: string;
  /** Only the two demo identities in real use; tests pass fixture addresses. */
  emails?: readonly string[];
}): Promise<RetirementReport> {
  const database = getDatabase();
  const emails = options.emails ?? retiredDemoEmails;
  const checkedAt = new Date().toISOString();

  const protectedEmail = options.adminEmail?.trim().toLowerCase();
  if (
    protectedEmail &&
    emails.some((email) => email.toLowerCase() === protectedEmail)
  ) {
    throw new Error(
      "ADMIN_EMAIL names a demo identity. Refusing to retire the account that administers the site.",
    );
  }

  if (!options.confirm) {
    const { found, absent } = await collectEvidence(database, emails);
    return {
      mode: "dry-run",
      checkedAt,
      found,
      absent,
      remainingAfter: null,
    };
  }

  return database.transaction(async (transaction) => {
    const { found, absent } = await collectEvidence(transaction, emails);

    if (found.length > 0) {
      await transaction.delete(user).where(
        inArray(
          user.id,
          found.map((entry) => entry.userId),
        ),
      );
    }

    const remaining = await transaction
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.email, [...emails]));
    const leftoverMemberships = found.length
      ? await transaction
          .select({ id: businessMembership.id })
          .from(businessMembership)
          .where(
            inArray(
              businessMembership.userId,
              found.map((entry) => entry.userId),
            ),
          )
      : [];
    if (remaining.length > 0 || leftoverMemberships.length > 0) {
      // Rolls the whole transaction back.
      throw new Error(
        "The demo identities or their memberships are still present after deletion; nothing was changed.",
      );
    }

    const report: RetirementReport = {
      mode: "confirmed",
      checkedAt,
      found,
      absent,
      remainingAfter: 0,
    };

    await transaction.insert(adminAuditLog).values({
      actorUserId: null,
      action: retirementAuditAction,
      targetType: "release",
      targetId: "public-release",
      metadata: report,
    });

    return report;
  });
}

async function main(): Promise<void> {
  const confirm = process.argv.includes("--confirm");
  const report = await retirePrivilegedDemoAccounts({
    confirm,
    adminEmail: process.env.ADMIN_EMAIL,
  });

  console.info(JSON.stringify(report, null, 2));
  if (report.mode === "dry-run") {
    console.info(
      report.found.length === 0
        ? "Dry run: both privileged demo identities are already absent."
        : "Dry run: nothing was changed. Re-run with --confirm to delete the identities listed above.",
    );
  } else {
    console.info(
      "Retired the privileged demo identities and their sessions. Keep the report above with the release record. Redeploying while the release stage is not `public` would provision them again.",
    );
  }
}

// Only run when invoked as a script, so the tests can import the function.
if (process.argv[1]?.endsWith("retire-privileged-demo-accounts.ts")) {
  main()
    .catch((error: unknown) => {
      console.error(
        error instanceof Error ? error.message : "Retirement failed.",
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDatabase();
    });
}
