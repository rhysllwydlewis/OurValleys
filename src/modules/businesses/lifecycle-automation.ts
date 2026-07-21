import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  businessPublication,
  businessSite,
} from "@/lib/database/schema/business";
import { businessTermsAcceptance } from "@/lib/database/schema/business-governance";
import {
  businessContactMethod,
  businessLifecycle,
  businessTicket,
} from "@/lib/database/schema/business-operations";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import { sendTransactionalEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import { deriveCompletedOnboardingSteps } from "./onboarding-draft";

export const currentBusinessTermsVersion = "2026-07-21-v1";
export const autoPublicationDelayDays = 14;
export const annualConfirmationMonths = 12;
export const inactivityGraceDays = 60;
export const deletionRecoveryDays = 30;

const requiredSteps = ["profile", "location", "services", "hours"] as const;

export type BusinessLifecycleState =
  | "active"
  | "paused"
  | "temporarily_closed"
  | "permanently_closed"
  | "deletion_pending";

export type LifecycleView = {
  state: BusinessLifecycleState;
  autoPublishEnabled: boolean;
  autoPublishAt: Date | null;
  postponedUntil: Date | null;
  termsAccepted: boolean;
  lastConfirmedAt: Date | null;
  nextConfirmationDueAt: Date | null;
  temporaryClosedUntil: Date | null;
  deletionRequestedAt: Date | null;
  deleteAfter: Date | null;
};

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonths(value: Date, months: number): Date {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function toLifecycleState(value: string): BusinessLifecycleState {
  return [
    "paused",
    "temporarily_closed",
    "permanently_closed",
    "deletion_pending",
  ].includes(value)
    ? (value as BusinessLifecycleState)
    : "active";
}

export async function ensureBusinessLifecycle(
  businessId: string,
): Promise<LifecycleView | null> {
  try {
    const database = getDatabase();
    const now = new Date();
    await database
      .insert(businessLifecycle)
      .values({
        businessId,
        lastConfirmedAt: now,
        nextConfirmationDueAt: addMonths(now, annualConfirmationMonths),
      })
      .onConflictDoNothing({ target: businessLifecycle.businessId });
    return getBusinessLifecycleView(businessId);
  } catch {
    return null;
  }
}

export async function getBusinessLifecycleView(
  businessId: string,
): Promise<LifecycleView | null> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        state: businessLifecycle.state,
        autoPublishEnabled: businessLifecycle.autoPublishEnabled,
        autoPublishAt: businessLifecycle.autoPublishAt,
        postponedUntil: businessLifecycle.postponedUntil,
        lastConfirmedAt: businessLifecycle.lastConfirmedAt,
        nextConfirmationDueAt: businessLifecycle.nextConfirmationDueAt,
        temporaryClosedUntil: businessLifecycle.temporaryClosedUntil,
        deletionRequestedAt: businessLifecycle.deletionRequestedAt,
        deleteAfter: businessLifecycle.deleteAfter,
        termsVersion: businessTermsAcceptance.termsVersion,
      })
      .from(businessLifecycle)
      .leftJoin(
        businessTermsAcceptance,
        eq(businessTermsAcceptance.businessId, businessLifecycle.businessId),
      )
      .where(eq(businessLifecycle.businessId, businessId))
      .limit(1);
    if (!row) return null;
    return {
      state: toLifecycleState(row.state),
      autoPublishEnabled: row.autoPublishEnabled,
      autoPublishAt: row.autoPublishAt,
      postponedUntil: row.postponedUntil,
      termsAccepted: row.termsVersion === currentBusinessTermsVersion,
      lastConfirmedAt: row.lastConfirmedAt,
      nextConfirmationDueAt: row.nextConfirmationDueAt,
      temporaryClosedUntil: row.temporaryClosedUntil,
      deletionRequestedAt: row.deletionRequestedAt,
      deleteAfter: row.deleteAfter,
    };
  } catch {
    return null;
  }
}

export async function acceptBusinessTerms(input: {
  businessId: string;
  userId: string;
}): Promise<"accepted" | "unavailable"> {
  try {
    const database = getDatabase();
    await database
      .insert(businessTermsAcceptance)
      .values({
        businessId: input.businessId,
        acceptedByUserId: input.userId,
        termsVersion: currentBusinessTermsVersion,
      })
      .onConflictDoUpdate({
        target: businessTermsAcceptance.businessId,
        set: {
          acceptedByUserId: input.userId,
          termsVersion: currentBusinessTermsVersion,
          acceptedAt: sql`now()`,
        },
      });
    return "accepted";
  } catch {
    return "unavailable";
  }
}

export type PublicationEligibility = {
  eligible: boolean;
  missing: string[];
};

export async function getAutomaticPublicationEligibility(
  businessId: string,
): Promise<PublicationEligibility> {
  const missing: string[] = [];
  try {
    const database = getDatabase();
    const [businessRow] = await database
      .select({
        id: business.id,
        status: business.status,
        isDemo: business.isDemo,
        publicPhone: business.publicPhone,
        publicEmail: business.publicEmail,
      })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);
    if (!businessRow) return { eligible: false, missing: ["business"] };
    if (businessRow.isDemo) missing.push("non-demo business");
    if (!["draft", "rejected"].includes(businessRow.status)) {
      missing.push("eligible draft status");
    }

    const [owner] = await database
      .select({ verified: user.emailVerified })
      .from(businessMembership)
      .innerJoin(user, eq(user.id, businessMembership.userId))
      .where(
        and(
          eq(businessMembership.businessId, businessId),
          eq(businessMembership.role, "owner"),
          eq(businessMembership.status, "active"),
        ),
      )
      .limit(1);
    if (!owner?.verified) missing.push("verified owner email");

    const [draft] = await database
      .select()
      .from(businessOnboardingDraft)
      .where(eq(businessOnboardingDraft.businessId, businessId))
      .limit(1);
    const completed = draft
      ? deriveCompletedOnboardingSteps({
          profile: draft.profile as never,
          location: draft.location as never,
          services: draft.services as never,
          hours: draft.hours as never,
        })
      : [];
    for (const step of requiredSteps) {
      if (!completed.includes(step)) missing.push(step);
    }

    const [terms] = await database
      .select({ version: businessTermsAcceptance.termsVersion })
      .from(businessTermsAcceptance)
      .where(eq(businessTermsAcceptance.businessId, businessId))
      .limit(1);
    if (terms?.version !== currentBusinessTermsVersion)
      missing.push("accepted terms");

    const [contact] = await database
      .select({ id: businessContactMethod.id })
      .from(businessContactMethod)
      .where(
        and(
          eq(businessContactMethod.businessId, businessId),
          eq(businessContactMethod.enabled, true),
        ),
      )
      .limit(1);
    if (!contact && !businessRow.publicEmail && !businessRow.publicPhone) {
      missing.push("working contact action");
    }

    const [conflict] = await database
      .select({ id: businessTicket.id })
      .from(businessTicket)
      .where(
        and(
          eq(businessTicket.businessId, businessId),
          eq(businessTicket.riskLevel, "high"),
          or(
            eq(businessTicket.status, "open"),
            eq(businessTicket.status, "awaiting_information"),
          ),
        ),
      )
      .limit(1);
    if (conflict) missing.push("resolved high-risk conflict");

    return { eligible: missing.length === 0, missing };
  } catch {
    return {
      eligible: false,
      missing: ["automated checks temporarily unavailable"],
    };
  }
}

export async function configureAutomaticPublication(input: {
  businessId: string;
  enabled: boolean;
  now?: Date;
}): Promise<"updated" | "unavailable"> {
  try {
    const database = getDatabase();
    const now = input.now ?? new Date();
    await database
      .insert(businessLifecycle)
      .values({
        businessId: input.businessId,
        autoPublishEnabled: input.enabled,
        autoPublishAt: input.enabled
          ? addDays(now, autoPublicationDelayDays)
          : null,
        lastConfirmedAt: now,
        nextConfirmationDueAt: addMonths(now, annualConfirmationMonths),
      })
      .onConflictDoUpdate({
        target: businessLifecycle.businessId,
        set: {
          autoPublishEnabled: input.enabled,
          autoPublishAt: input.enabled
            ? addDays(now, autoPublicationDelayDays)
            : null,
          postponedUntil: null,
          updatedAt: sql`now()`,
        },
      });
    return "updated";
  } catch {
    return "unavailable";
  }
}

export async function postponeAutomaticPublication(input: {
  businessId: string;
  until: Date;
}): Promise<"updated" | "invalid" | "unavailable"> {
  const maximum = addDays(new Date(), 90);
  if (input.until <= new Date() || input.until > maximum) return "invalid";
  try {
    const database = getDatabase();
    await database
      .update(businessLifecycle)
      .set({
        postponedUntil: input.until,
        autoPublishAt: input.until,
        prePublishReminderSentAt: null,
        updatedAt: sql`now()`,
      })
      .where(eq(businessLifecycle.businessId, input.businessId));
    return "updated";
  } catch {
    return "unavailable";
  }
}

export async function confirmBusinessTrading(input: {
  businessId: string;
  actorUserId: string;
  now?: Date;
}): Promise<"confirmed" | "unavailable"> {
  try {
    const database = getDatabase();
    const now = input.now ?? new Date();
    await database
      .insert(businessLifecycle)
      .values({
        businessId: input.businessId,
        lastConfirmedAt: now,
        nextConfirmationDueAt: addMonths(now, annualConfirmationMonths),
      })
      .onConflictDoUpdate({
        target: businessLifecycle.businessId,
        set: {
          lastConfirmedAt: now,
          nextConfirmationDueAt: addMonths(now, annualConfirmationMonths),
          staleAt: null,
          updatedAt: sql`now()`,
        },
      });
    await recordAdminAudit({
      actorUserId: input.actorUserId,
      action: "business.trading_confirmed",
      targetType: "business",
      targetId: input.businessId,
    });
    return "confirmed";
  } catch {
    return "unavailable";
  }
}

export async function changeBusinessLifecycle(input: {
  businessId: string;
  actorUserId: string;
  action:
    | "pause"
    | "resume"
    | "temporary_close"
    | "permanent_close"
    | "request_deletion"
    | "cancel_deletion";
  temporaryClosedUntil?: Date | null;
}): Promise<"updated" | "invalid" | "not_found" | "unavailable"> {
  try {
    const database = getDatabase();
    const result = await database.transaction(async (transaction) => {
      const [businessRow] = await transaction
        .select({ id: business.id, status: business.status })
        .from(business)
        .where(eq(business.id, input.businessId))
        .for("update")
        .limit(1);
      if (!businessRow) return "not_found" as const;

      const now = new Date();
      const [publication] = await transaction
        .select({ publishedAt: businessPublication.publishedAt })
        .from(businessPublication)
        .where(eq(businessPublication.businessId, input.businessId))
        .limit(1);
      const wasPublished = Boolean(publication?.publishedAt);

      await transaction
        .insert(businessLifecycle)
        .values({
          businessId: input.businessId,
          lastConfirmedAt: now,
          nextConfirmationDueAt: addMonths(now, annualConfirmationMonths),
        })
        .onConflictDoNothing({ target: businessLifecycle.businessId });

      switch (input.action) {
        case "pause":
          await transaction
            .update(businessLifecycle)
            .set({ state: "paused", pausedAt: now, updatedAt: sql`now()` })
            .where(eq(businessLifecycle.businessId, input.businessId));
          await setPublicationStatus(transaction, input.businessId, "paused");
          break;
        case "resume":
          await transaction
            .update(businessLifecycle)
            .set({
              state: "active",
              pausedAt: null,
              temporaryClosedUntil: null,
              permanentlyClosedAt: null,
              deletionRequestedAt: null,
              deleteAfter: null,
              updatedAt: sql`now()`,
            })
            .where(eq(businessLifecycle.businessId, input.businessId));
          await setPublicationStatus(
            transaction,
            input.businessId,
            wasPublished ? "published" : "draft",
          );
          break;
        case "temporary_close":
          if (
            !input.temporaryClosedUntil ||
            input.temporaryClosedUntil <= now
          ) {
            return "invalid" as const;
          }
          await transaction
            .update(businessLifecycle)
            .set({
              state: "temporarily_closed",
              temporaryClosedUntil: input.temporaryClosedUntil,
              updatedAt: sql`now()`,
            })
            .where(eq(businessLifecycle.businessId, input.businessId));
          break;
        case "permanent_close":
          await transaction
            .update(businessLifecycle)
            .set({
              state: "permanently_closed",
              permanentlyClosedAt: now,
              updatedAt: sql`now()`,
            })
            .where(eq(businessLifecycle.businessId, input.businessId));
          break;
        case "request_deletion":
          await transaction
            .update(businessLifecycle)
            .set({
              state: "deletion_pending",
              deletionRequestedAt: now,
              deleteAfter: addDays(now, deletionRecoveryDays),
              updatedAt: sql`now()`,
            })
            .where(eq(businessLifecycle.businessId, input.businessId));
          await setPublicationStatus(
            transaction,
            input.businessId,
            "deletion_pending",
          );
          break;
        case "cancel_deletion":
          await transaction
            .update(businessLifecycle)
            .set({
              state: "active",
              deletionRequestedAt: null,
              deleteAfter: null,
              updatedAt: sql`now()`,
            })
            .where(eq(businessLifecycle.businessId, input.businessId));
          await setPublicationStatus(
            transaction,
            input.businessId,
            wasPublished ? "published" : "draft",
          );
          break;
      }
      return "updated" as const;
    });

    if (result === "updated") {
      await recordAdminAudit({
        actorUserId: input.actorUserId,
        action: "business.lifecycle_changed",
        targetType: "business",
        targetId: input.businessId,
        metadata: { action: input.action },
      });
    }
    return result;
  } catch {
    return "unavailable";
  }
}

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

async function setPublicationStatus(
  transaction: Transaction,
  businessId: string,
  status: string,
): Promise<void> {
  await transaction
    .update(business)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(business.id, businessId));
  await transaction
    .update(businessPublication)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(businessPublication.businessId, businessId));
  await transaction
    .update(businessSite)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(businessSite.businessId, businessId));
}

async function publishAutomatically(
  businessId: string,
  ownerUserId: string,
): Promise<boolean> {
  const database = getDatabase();
  const published = await database.transaction(async (transaction) => {
    const [row] = await transaction
      .select({ slug: business.slug, status: business.status })
      .from(business)
      .where(eq(business.id, businessId))
      .for("update")
      .limit(1);
    if (!row || !["draft", "rejected"].includes(row.status)) return false;

    const [existingSite] = await transaction
      .select({ id: businessSite.id })
      .from(businessSite)
      .where(eq(businessSite.businessId, businessId))
      .limit(1);
    let siteId = existingSite?.id;
    if (!siteId) {
      const [created] = await transaction
        .insert(businessSite)
        .values({
          businessId,
          templateKey: "standard",
          platformPath: `/b/${row.slug}`,
          status: "published",
          publishedAt: sql`now()`,
        })
        .returning({ id: businessSite.id });
      siteId = created?.id;
    } else {
      await transaction
        .update(businessSite)
        .set({
          status: "published",
          publishedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(businessSite.id, siteId));
    }
    if (!siteId) return false;

    await transaction
      .insert(businessPublication)
      .values({
        businessId,
        businessSiteId: siteId,
        status: "published",
        publishedAt: sql`now()`,
        submittedAt: sql`now()`,
        submittedByUserId: ownerUserId,
        moderationNote:
          "Published automatically after eligibility checks and reminders.",
      })
      .onConflictDoUpdate({
        target: businessPublication.businessId,
        set: {
          status: "published",
          publishedAt: sql`now()`,
          submittedAt: sql`now()`,
          submittedByUserId: ownerUserId,
          moderationNote:
            "Published automatically after eligibility checks and reminders.",
          revisionNumber: sql`${businessPublication.revisionNumber} + 1`,
          updatedAt: sql`now()`,
        },
      });
    await transaction
      .update(business)
      .set({ status: "published", updatedAt: sql`now()` })
      .where(eq(business.id, businessId));
    await transaction
      .update(businessLifecycle)
      .set({
        state: "active",
        autoPublishEnabled: false,
        autoPublishAt: null,
        postponedUntil: null,
        lastConfirmedAt: sql`now()`,
        nextConfirmationDueAt: sql`now() + interval '12 months'`,
        updatedAt: sql`now()`,
      })
      .where(eq(businessLifecycle.businessId, businessId));
    return true;
  });

  if (published) {
    await recordAdminAudit({
      actorUserId: ownerUserId,
      action: "business.auto_published",
      targetType: "business",
      targetId: businessId,
      metadata: { automated: true },
    });
  }
  return published;
}

async function ownerRecipients(businessId: string) {
  const database = getDatabase();
  return database
    .select({ id: user.id, email: user.email, name: user.name })
    .from(businessMembership)
    .innerJoin(user, eq(user.id, businessMembership.userId))
    .where(
      and(
        eq(businessMembership.businessId, businessId),
        eq(businessMembership.role, "owner"),
        eq(businessMembership.status, "active"),
      ),
    );
}

async function sendLifecycleEmail(input: {
  businessId: string;
  businessName: string;
  subject: string;
  message: string;
}): Promise<void> {
  const recipients = await ownerRecipients(input.businessId);
  const dashboard = new URL(
    `/dashboard/business/${input.businessId}/operations#lifecycle`,
    getSiteUrl(),
  ).toString();
  await Promise.allSettled(
    recipients.map((recipient) =>
      sendTransactionalEmail({
        to: recipient.email,
        subject: input.subject,
        text: `${input.message}\n\nManage ${input.businessName}: ${dashboard}`,
      }),
    ),
  );
}

export type LifecycleAutomationResult = {
  inspected: number;
  remindersSent: number;
  published: number;
  unpublishedForInactivity: number;
};

export async function runLifecycleAutomation(
  now = new Date(),
): Promise<LifecycleAutomationResult> {
  const result: LifecycleAutomationResult = {
    inspected: 0,
    remindersSent: 0,
    published: 0,
    unpublishedForInactivity: 0,
  };

  try {
    const database = getDatabase();
    await database.execute(
      sql`select pg_advisory_lock(hashtext('business-lifecycle-automation'))`,
    );
    try {
      const rows = await database
        .select({
          businessId: businessLifecycle.businessId,
          businessName: business.tradingName,
          businessStatus: business.status,
          createdAt: business.createdAt,
          autoPublishEnabled: businessLifecycle.autoPublishEnabled,
          autoPublishAt: businessLifecycle.autoPublishAt,
          postponedUntil: businessLifecycle.postponedUntil,
          dayTwoReminderSentAt: businessLifecycle.dayTwoReminderSentAt,
          daySevenReminderSentAt: businessLifecycle.daySevenReminderSentAt,
          prePublishReminderSentAt: businessLifecycle.prePublishReminderSentAt,
          nextConfirmationDueAt: businessLifecycle.nextConfirmationDueAt,
          temporaryClosedUntil: businessLifecycle.temporaryClosedUntil,
          staleAt: businessLifecycle.staleAt,
          state: businessLifecycle.state,
        })
        .from(businessLifecycle)
        .innerJoin(business, eq(business.id, businessLifecycle.businessId));
      result.inspected = rows.length;

      for (const row of rows) {
        const ageMs = now.getTime() - row.createdAt.getTime();
        if (
          row.businessStatus === "draft" &&
          !row.dayTwoReminderSentAt &&
          ageMs >= 2 * 24 * 60 * 60 * 1000
        ) {
          await sendLifecycleEmail({
            businessId: row.businessId,
            businessName: row.businessName,
            subject: `Keep building ${row.businessName}`,
            message:
              "Your free business website is saved. Add the most useful missing details when you are ready.",
          });
          await database
            .update(businessLifecycle)
            .set({ dayTwoReminderSentAt: now })
            .where(eq(businessLifecycle.businessId, row.businessId));
          result.remindersSent += 1;
        }
        if (
          row.businessStatus === "draft" &&
          !row.daySevenReminderSentAt &&
          ageMs >= 7 * 24 * 60 * 60 * 1000
        ) {
          const eligibility = await getAutomaticPublicationEligibility(
            row.businessId,
          );
          await sendLifecycleEmail({
            businessId: row.businessId,
            businessName: row.businessName,
            subject: `${row.businessName} publication check`,
            message: eligibility.eligible
              ? "Your website is eligible for publication. Review it, publish now, postpone, or leave automatic publication enabled."
              : `Your website is still private. Complete: ${eligibility.missing.join(", ")}.`,
          });
          await database
            .update(businessLifecycle)
            .set({ daySevenReminderSentAt: now })
            .where(eq(businessLifecycle.businessId, row.businessId));
          result.remindersSent += 1;
        }

        const publishAt = row.postponedUntil ?? row.autoPublishAt;
        if (
          row.autoPublishEnabled &&
          publishAt &&
          publishAt > now &&
          publishAt.getTime() - now.getTime() <= 24 * 60 * 60 * 1000 &&
          !row.prePublishReminderSentAt
        ) {
          await sendLifecycleEmail({
            businessId: row.businessId,
            businessName: row.businessName,
            subject: `${row.businessName} is scheduled to publish`,
            message:
              "Your eligible website is scheduled to publish within 24 hours. You can review or postpone it from the dashboard.",
          });
          await database
            .update(businessLifecycle)
            .set({ prePublishReminderSentAt: now })
            .where(eq(businessLifecycle.businessId, row.businessId));
          result.remindersSent += 1;
        }

        if (row.autoPublishEnabled && publishAt && publishAt <= now) {
          const eligibility = await getAutomaticPublicationEligibility(
            row.businessId,
          );
          if (eligibility.eligible) {
            const [owner] = await ownerRecipients(row.businessId);
            if (
              owner &&
              (await publishAutomatically(row.businessId, owner.id))
            ) {
              result.published += 1;
            }
          }
        }

        if (
          row.state === "temporarily_closed" &&
          row.temporaryClosedUntil &&
          row.temporaryClosedUntil <= now
        ) {
          await database
            .update(businessLifecycle)
            .set({
              state: "active",
              temporaryClosedUntil: null,
              updatedAt: sql`now()`,
            })
            .where(eq(businessLifecycle.businessId, row.businessId));
        }

        if (row.nextConfirmationDueAt && row.nextConfirmationDueAt <= now) {
          if (!row.staleAt) {
            await database
              .update(businessLifecycle)
              .set({ staleAt: now, updatedAt: sql`now()` })
              .where(eq(businessLifecycle.businessId, row.businessId));
            await sendLifecycleEmail({
              businessId: row.businessId,
              businessName: row.businessName,
              subject: `Is ${row.businessName} still trading?`,
              message: `Confirm within ${inactivityGraceDays} days to keep the website current.`,
            });
            result.remindersSent += 1;
          } else if (addDays(row.staleAt, inactivityGraceDays) <= now) {
            await database.transaction(async (transaction) => {
              await setPublicationStatus(transaction, row.businessId, "paused");
              await transaction
                .update(businessLifecycle)
                .set({ state: "paused", pausedAt: now, updatedAt: sql`now()` })
                .where(eq(businessLifecycle.businessId, row.businessId));
            });
            const [owner] = await ownerRecipients(row.businessId);
            if (owner) {
              await recordAdminAudit({
                actorUserId: owner.id,
                action: "business.inactivity_unpublished",
                targetType: "business",
                targetId: row.businessId,
                metadata: { automated: true },
              });
            }
            result.unpublishedForInactivity += 1;
          }
        }
      }
      return result;
    } finally {
      await database.execute(
        sql`select pg_advisory_unlock(hashtext('business-lifecycle-automation'))`,
      );
    }
  } catch {
    return result;
  }
}
