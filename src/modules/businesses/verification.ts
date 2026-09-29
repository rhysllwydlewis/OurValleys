import "server-only";
import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business } from "@/lib/database/schema/business";
import { businessVerificationCheck } from "@/lib/database/schema/business-governance";

export const verificationCheckTypes = [
  "companies_house",
  "identity",
  "premises",
  "trade_body",
  "domain_or_social",
] as const;
export type VerificationCheckType = (typeof verificationCheckTypes)[number];

export const verificationCheckLabels: Record<VerificationCheckType, string> = {
  companies_house: "Company registration checked",
  identity: "Owner identity checked",
  premises: "Premises or service area checked",
  trade_body: "Trade body membership checked",
  domain_or_social: "Website or social profile ownership checked",
};

export type VerificationCheckView = {
  id: string;
  checkType: VerificationCheckType;
  status: "active" | "revoked";
  expired: boolean;
  evidenceNote: string;
  checkedAt: Date;
  checkedByEmail: string | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
};

type Database = ReturnType<typeof getDatabase>;
type Executor = Pick<Database, "select" | "update">;

/**
 * Sets the business's summary badge from its checks. A business is "verified"
 * only while at least one specific check is active and unexpired. Payment and
 * plan never influence this: there is deliberately no other input.
 */
export async function refreshVerificationSummary(
  executor: Executor,
  businessId: string,
  now = new Date(),
): Promise<"verified" | "unverified"> {
  const active = await executor
    .select({ id: businessVerificationCheck.id })
    .from(businessVerificationCheck)
    .where(
      and(
        eq(businessVerificationCheck.businessId, businessId),
        eq(businessVerificationCheck.status, "active"),
        or(
          isNull(businessVerificationCheck.expiresAt),
          gt(businessVerificationCheck.expiresAt, now),
        ),
      ),
    )
    .limit(1);
  const summary = active.length > 0 ? "verified" : "unverified";
  await executor
    .update(business)
    .set({ verificationSummaryStatus: summary })
    .where(eq(business.id, businessId));
  return summary;
}

export type RecordVerificationCheckResult =
  | { status: "recorded"; summary: "verified" | "unverified" }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function recordVerificationCheck(input: {
  adminUserId: string;
  businessId: string;
  checkType: string;
  evidenceNote: string;
  expiresAt: Date | null;
  now?: Date;
}): Promise<RecordVerificationCheckResult> {
  const now = input.now ?? new Date();
  const evidenceNote = input.evidenceNote.trim();
  if (
    !(verificationCheckTypes as readonly string[]).includes(input.checkType) ||
    evidenceNote.length < 5 ||
    (input.expiresAt !== null && input.expiresAt.getTime() <= now.getTime())
  ) {
    return { status: "invalid" };
  }
  try {
    const database = getDatabase();
    return await database.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: business.id })
        .from(business)
        .where(eq(business.id, input.businessId))
        .limit(1);
      if (!target) return { status: "not_found" as const };
      // One active check per type: recording again supersedes the old one.
      await tx
        .update(businessVerificationCheck)
        .set({
          status: "revoked",
          revokedAt: now,
          revokedByUserId: input.adminUserId,
          revokedReason: "Superseded by a newer check.",
        })
        .where(
          and(
            eq(businessVerificationCheck.businessId, input.businessId),
            eq(businessVerificationCheck.checkType, input.checkType),
            eq(businessVerificationCheck.status, "active"),
          ),
        );
      await tx.insert(businessVerificationCheck).values({
        businessId: input.businessId,
        checkType: input.checkType,
        evidenceNote,
        checkedByUserId: input.adminUserId,
        checkedAt: now,
        expiresAt: input.expiresAt,
      });
      const summary = await refreshVerificationSummary(
        tx,
        input.businessId,
        now,
      );
      return { status: "recorded" as const, summary };
    });
  } catch {
    return { status: "unavailable" };
  }
}

export type RevokeVerificationCheckResult =
  | {
      status: "revoked";
      businessId: string;
      summary: "verified" | "unverified";
    }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function revokeVerificationCheck(input: {
  adminUserId: string;
  checkId: string;
  reason: string;
  now?: Date;
}): Promise<RevokeVerificationCheckResult> {
  const now = input.now ?? new Date();
  const reason = input.reason.trim();
  if (reason.length < 5) return { status: "invalid" };
  try {
    const database = getDatabase();
    return await database.transaction(async (tx) => {
      const [revoked] = await tx
        .update(businessVerificationCheck)
        .set({
          status: "revoked",
          revokedAt: now,
          revokedByUserId: input.adminUserId,
          revokedReason: reason,
        })
        .where(
          and(
            eq(businessVerificationCheck.id, input.checkId),
            eq(businessVerificationCheck.status, "active"),
          ),
        )
        .returning({ businessId: businessVerificationCheck.businessId });
      if (!revoked) return { status: "not_found" as const };
      const summary = await refreshVerificationSummary(
        tx,
        revoked.businessId,
        now,
      );
      return {
        status: "revoked" as const,
        businessId: revoked.businessId,
        summary,
      };
    });
  } catch {
    return { status: "unavailable" };
  }
}

export async function listVerificationChecks(
  businessId: string,
  now = new Date(),
): Promise<VerificationCheckView[]> {
  const database = getDatabase();
  const rows = await database
    .select({
      id: businessVerificationCheck.id,
      checkType: businessVerificationCheck.checkType,
      status: businessVerificationCheck.status,
      evidenceNote: businessVerificationCheck.evidenceNote,
      checkedAt: businessVerificationCheck.checkedAt,
      checkedByEmail: user.email,
      expiresAt: businessVerificationCheck.expiresAt,
      revokedAt: businessVerificationCheck.revokedAt,
      revokedReason: businessVerificationCheck.revokedReason,
    })
    .from(businessVerificationCheck)
    .leftJoin(user, eq(user.id, businessVerificationCheck.checkedByUserId))
    .where(eq(businessVerificationCheck.businessId, businessId))
    .orderBy(asc(businessVerificationCheck.checkedAt));
  return rows.map((row) => ({
    ...row,
    checkType: row.checkType as VerificationCheckType,
    status: row.status as "active" | "revoked",
    expired: row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime(),
  }));
}

/**
 * Downgrades businesses whose only active checks have expired. Safe to run
 * repeatedly from the scheduled worker.
 */
export async function expireVerificationChecks(
  now = new Date(),
): Promise<{ downgraded: number }> {
  try {
    const database = getDatabase();
    const stale = await database
      .select({ businessId: business.id })
      .from(business)
      .innerJoin(
        businessVerificationCheck,
        eq(businessVerificationCheck.businessId, business.id),
      )
      .where(
        and(
          eq(business.verificationSummaryStatus, "verified"),
          eq(businessVerificationCheck.status, "active"),
          lte(businessVerificationCheck.expiresAt, now),
        ),
      );
    let downgraded = 0;
    for (const id of new Set(stale.map((row) => row.businessId))) {
      const summary = await refreshVerificationSummary(database, id, now);
      if (summary === "unverified") downgraded += 1;
    }
    return { downgraded };
  } catch {
    return { downgraded: 0 };
  }
}
