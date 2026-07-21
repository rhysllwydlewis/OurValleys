import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessMembership,
  businessPublication,
  businessSite,
} from "@/lib/database/schema/business";
import {
  businessSlugRedirect,
  businessTicket,
  businessTicketEvent,
} from "@/lib/database/schema/business-operations";
import { businessPermissions } from "@/modules/identity/access-policy";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import { slugifyBusinessName } from "./slug";

export const businessTicketTypes = [
  "claim",
  "duplicate",
  "correction",
  "slug_change",
] as const;
export type BusinessTicketType = (typeof businessTicketTypes)[number];

export const ticketResolutionActions = [
  "approve_claim",
  "add_manager",
  "transfer_control",
  "keep_separate",
  "merge_duplicate",
  "restore_duplicate",
  "accept_correction",
  "approve_slug_change",
  "request_information",
  "reject",
  "dismiss",
] as const;
export type TicketResolutionAction = (typeof ticketResolutionActions)[number];

const createTicketSchema = z.object({
  businessId: z.uuid(),
  relatedBusinessId: z.uuid().nullable().optional(),
  reporterUserId: z.uuid().nullable().optional(),
  reporterEmail: z
    .union([z.email().max(254), z.literal("")])
    .nullable()
    .optional(),
  type: z.enum(businessTicketTypes),
  reason: z.string().trim().min(10).max(2000),
  evidence: z.record(z.string(), z.unknown()).optional(),
  riskLevel: z.enum(["standard", "high"]).default("standard"),
});

export type CreateBusinessTicketResult =
  | { status: "created"; ticketId: string }
  | { status: "invalid"; message: string }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function createBusinessTicket(
  input: z.input<typeof createTicketSchema>,
): Promise<CreateBusinessTicketResult> {
  const parsed = createTicketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      message:
        parsed.error.issues[0]?.message ?? "Check the request and try again.",
    };
  }

  try {
    const database = getDatabase();
    const [target] = await database
      .select({ id: business.id, status: business.status, slug: business.slug })
      .from(business)
      .where(eq(business.id, parsed.data.businessId))
      .limit(1);
    if (!target) return { status: "not_found" };

    let relatedSnapshot: { id: string; status: string; slug: string } | null =
      null;
    if (parsed.data.relatedBusinessId) {
      const [related] = await database
        .select({
          id: business.id,
          status: business.status,
          slug: business.slug,
        })
        .from(business)
        .where(eq(business.id, parsed.data.relatedBusinessId))
        .limit(1);
      if (!related) return { status: "not_found" };
      relatedSnapshot = related;
    }

    const [created] = await database
      .insert(businessTicket)
      .values({
        businessId: parsed.data.businessId,
        relatedBusinessId: parsed.data.relatedBusinessId ?? null,
        reporterUserId: parsed.data.reporterUserId ?? null,
        reporterEmail: parsed.data.reporterEmail || null,
        type: parsed.data.type,
        reason: parsed.data.reason,
        riskLevel: parsed.data.riskLevel,
        evidence: {
          ...(parsed.data.evidence ?? {}),
          targetSnapshot: target,
          relatedSnapshot,
        },
      })
      .returning({ id: businessTicket.id });
    if (!created) return { status: "unavailable" };

    await database.insert(businessTicketEvent).values({
      ticketId: created.id,
      actorUserId: parsed.data.reporterUserId ?? null,
      action: "created",
      note: parsed.data.reason,
      metadata: { type: parsed.data.type, riskLevel: parsed.data.riskLevel },
    });

    return { status: "created", ticketId: created.id };
  } catch {
    return { status: "unavailable" };
  }
}

export type BusinessTicketView = {
  id: string;
  businessId: string;
  businessName: string;
  relatedBusinessId: string | null;
  relatedBusinessName: string | null;
  reporterUserId: string | null;
  reporterEmail: string | null;
  type: BusinessTicketType;
  reason: string;
  evidence: Record<string, unknown> | null;
  riskLevel: "standard" | "high";
  status: string;
  resolutionAction: string | null;
  resolutionNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

export async function listBusinessTickets(
  status?: string,
): Promise<{ state: "ready" | "unavailable"; tickets: BusinessTicketView[] }> {
  try {
    const database = getDatabase();
    const related = alias(business, "related_business");
    const filters = status ? [eq(businessTicket.status, status)] : [];
    const rows = await database
      .select({
        id: businessTicket.id,
        businessId: businessTicket.businessId,
        businessName: business.tradingName,
        relatedBusinessId: businessTicket.relatedBusinessId,
        relatedBusinessName: related.tradingName,
        reporterUserId: businessTicket.reporterUserId,
        reporterEmail: businessTicket.reporterEmail,
        type: businessTicket.type,
        reason: businessTicket.reason,
        evidence: businessTicket.evidence,
        riskLevel: businessTicket.riskLevel,
        status: businessTicket.status,
        resolutionAction: businessTicket.resolutionAction,
        resolutionNote: businessTicket.resolutionNote,
        createdAt: businessTicket.createdAt,
        resolvedAt: businessTicket.resolvedAt,
      })
      .from(businessTicket)
      .innerJoin(business, eq(business.id, businessTicket.businessId))
      .leftJoin(related, eq(related.id, businessTicket.relatedBusinessId))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(businessTicket.createdAt))
      .limit(250);

    return {
      state: "ready",
      tickets: rows
        .filter((row) =>
          (businessTicketTypes as readonly string[]).includes(row.type),
        )
        .map((row) => ({
          ...row,
          type: row.type as BusinessTicketType,
          riskLevel: row.riskLevel === "high" ? "high" : "standard",
          evidence: (row.evidence as Record<string, unknown> | null) ?? null,
        })),
    };
  } catch {
    return { state: "unavailable", tickets: [] };
  }
}

function safeCorrectionChanges(evidence: Record<string, unknown> | null): {
  publicPhone?: string | null;
  publicEmail?: string | null;
  summary?: string;
  description?: string;
} {
  const changes = evidence?.changes;
  if (!changes || typeof changes !== "object" || Array.isArray(changes))
    return {};
  const record = changes as Record<string, unknown>;
  const result: {
    publicPhone?: string | null;
    publicEmail?: string | null;
    summary?: string;
    description?: string;
  } = {};
  if (record.publicPhone === null || typeof record.publicPhone === "string") {
    result.publicPhone = record.publicPhone?.trim().slice(0, 30) || null;
  }
  if (
    record.publicEmail === null ||
    (typeof record.publicEmail === "string" &&
      z.email().safeParse(record.publicEmail).success)
  ) {
    result.publicEmail =
      typeof record.publicEmail === "string"
        ? record.publicEmail.trim().slice(0, 254)
        : null;
  }
  if (typeof record.summary === "string")
    result.summary = record.summary.trim().slice(0, 240);
  if (typeof record.description === "string") {
    result.description = record.description.trim().slice(0, 5000);
  }
  return result;
}

function proposedSlug(evidence: Record<string, unknown> | null): string | null {
  const raw = evidence?.proposedSlug;
  if (typeof raw !== "string") return null;
  const normalised = slugifyBusinessName(raw);
  return normalised || null;
}

export type ResolveBusinessTicketResult =
  | { status: "resolved" }
  | { status: "invalid"; message: string }
  | { status: "not_found" }
  | { status: "not_eligible" }
  | { status: "unavailable" };

export async function resolveBusinessTicket(input: {
  adminUserId: string;
  ticketId: string;
  action: TicketResolutionAction;
  note: string;
}): Promise<ResolveBusinessTicketResult> {
  if (
    !z.uuid().safeParse(input.ticketId).success ||
    input.note.trim().length < 3
  ) {
    return { status: "invalid", message: "Add a clear resolution note." };
  }

  try {
    const database = getDatabase();
    const result = await database.transaction(async (transaction) => {
      const [ticket] = await transaction
        .select()
        .from(businessTicket)
        .where(eq(businessTicket.id, input.ticketId))
        .for("update")
        .limit(1);
      if (!ticket) return { status: "not_found" } as const;

      const evidence =
        (ticket.evidence as Record<string, unknown> | null) ?? null;
      const terminal = [
        "approved",
        "rejected",
        "resolved",
        "dismissed",
      ].includes(ticket.status);
      if (terminal && input.action !== "restore_duplicate") {
        return { status: "not_eligible" } as const;
      }

      const managerPermissions = [
        businessPermissions.view,
        businessPermissions.editProfile,
        businessPermissions.publish,
        businessPermissions.manageMembers,
        businessPermissions.manageContacts,
        businessPermissions.manageEnquiries,
        businessPermissions.manageContent,
        businessPermissions.manageLifecycle,
        businessPermissions.viewAnalytics,
      ];

      switch (input.action) {
        case "approve_claim":
        case "add_manager": {
          if (!ticket.reporterUserId) {
            return {
              status: "invalid",
              message: "This claim is not attached to a signed-in account.",
            } as const;
          }
          await transaction
            .insert(businessMembership)
            .values({
              businessId: ticket.businessId,
              userId: ticket.reporterUserId,
              role: "manager",
              permissions: managerPermissions,
              status: "active",
              acceptedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                businessMembership.businessId,
                businessMembership.userId,
              ],
              set: {
                role: "manager",
                permissions: managerPermissions,
                status: "active",
                acceptedAt: sql`coalesce(${businessMembership.acceptedAt}, now())`,
              },
            });
          await transaction
            .update(business)
            .set({ claimStatus: "claimed", updatedAt: sql`now()` })
            .where(eq(business.id, ticket.businessId));
          break;
        }

        case "transfer_control": {
          if (!ticket.reporterUserId) {
            return {
              status: "invalid",
              message: "This claim is not attached to a signed-in account.",
            } as const;
          }
          await transaction
            .update(businessMembership)
            .set({ role: "manager", permissions: managerPermissions })
            .where(
              and(
                eq(businessMembership.businessId, ticket.businessId),
                eq(businessMembership.role, "owner"),
              ),
            );
          await transaction
            .insert(businessMembership)
            .values({
              businessId: ticket.businessId,
              userId: ticket.reporterUserId,
              role: "owner",
              permissions: Object.values(businessPermissions),
              status: "active",
              acceptedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                businessMembership.businessId,
                businessMembership.userId,
              ],
              set: {
                role: "owner",
                permissions: Object.values(businessPermissions),
                status: "active",
                acceptedAt: sql`coalesce(${businessMembership.acceptedAt}, now())`,
              },
            });
          await transaction
            .update(business)
            .set({ claimStatus: "claimed", updatedAt: sql`now()` })
            .where(eq(business.id, ticket.businessId));
          break;
        }

        case "merge_duplicate": {
          if (!ticket.relatedBusinessId) {
            return {
              status: "invalid",
              message: "Choose the related duplicate before merging.",
            } as const;
          }
          const [primary, duplicate] = await Promise.all([
            transaction
              .select({ slug: business.slug })
              .from(business)
              .where(eq(business.id, ticket.businessId))
              .limit(1),
            transaction
              .select({ slug: business.slug })
              .from(business)
              .where(eq(business.id, ticket.relatedBusinessId))
              .limit(1),
          ]);
          const primaryRow = primary[0];
          const duplicateRow = duplicate[0];
          if (!primaryRow || !duplicateRow)
            return { status: "not_found" } as const;

          const duplicateMemberships = await transaction
            .select({ userId: businessMembership.userId })
            .from(businessMembership)
            .where(eq(businessMembership.businessId, ticket.relatedBusinessId));
          for (const membership of duplicateMemberships) {
            await transaction
              .insert(businessMembership)
              .values({
                businessId: ticket.businessId,
                userId: membership.userId,
                role: "manager",
                permissions: managerPermissions,
                status: "active",
                acceptedAt: new Date(),
              })
              .onConflictDoNothing({
                target: [
                  businessMembership.businessId,
                  businessMembership.userId,
                ],
              });
          }
          await transaction
            .insert(businessSlugRedirect)
            .values({
              businessId: ticket.businessId,
              fromSlug: duplicateRow.slug,
              toSlug: primaryRow.slug,
            })
            .onConflictDoUpdate({
              target: businessSlugRedirect.fromSlug,
              set: { businessId: ticket.businessId, toSlug: primaryRow.slug },
            });
          await transaction
            .update(business)
            .set({ status: "removed", updatedAt: sql`now()` })
            .where(eq(business.id, ticket.relatedBusinessId));
          break;
        }

        case "restore_duplicate": {
          if (!ticket.relatedBusinessId)
            return { status: "not_eligible" } as const;
          const snapshot = evidence?.relatedSnapshot;
          const previousStatus =
            snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
              ? (snapshot as Record<string, unknown>).status
              : null;
          const restoredStatus =
            typeof previousStatus === "string" &&
            [
              "draft",
              "pending_review",
              "published",
              "rejected",
              "suspended",
            ].includes(previousStatus)
              ? previousStatus
              : "draft";
          await transaction
            .update(business)
            .set({ status: restoredStatus, updatedAt: sql`now()` })
            .where(eq(business.id, ticket.relatedBusinessId));
          const [related] = await transaction
            .select({ slug: business.slug })
            .from(business)
            .where(eq(business.id, ticket.relatedBusinessId))
            .limit(1);
          if (related) {
            await transaction
              .delete(businessSlugRedirect)
              .where(eq(businessSlugRedirect.fromSlug, related.slug));
          }
          if (restoredStatus === "published") {
            await transaction
              .update(businessPublication)
              .set({ status: "published", updatedAt: sql`now()` })
              .where(
                eq(businessPublication.businessId, ticket.relatedBusinessId),
              );
            await transaction
              .update(businessSite)
              .set({ status: "published", updatedAt: sql`now()` })
              .where(eq(businessSite.businessId, ticket.relatedBusinessId));
          }
          break;
        }

        case "accept_correction": {
          const changes = safeCorrectionChanges(evidence);
          if (Object.keys(changes).length > 0) {
            await transaction
              .update(business)
              .set({ ...changes, updatedAt: sql`now()` })
              .where(eq(business.id, ticket.businessId));
          }
          break;
        }

        case "approve_slug_change": {
          const nextSlug = proposedSlug(evidence);
          if (!nextSlug) {
            return {
              status: "invalid",
              message: "The ticket does not contain a valid proposed slug.",
            } as const;
          }
          const [current, collision] = await Promise.all([
            transaction
              .select({ slug: business.slug })
              .from(business)
              .where(eq(business.id, ticket.businessId))
              .limit(1),
            transaction
              .select({ id: business.id })
              .from(business)
              .where(eq(business.slug, nextSlug))
              .limit(1),
          ]);
          const currentRow = current[0];
          if (!currentRow) return { status: "not_found" } as const;
          if (collision[0]) {
            return {
              status: "invalid",
              message: "That web address is already in use.",
            } as const;
          }
          await transaction.insert(businessSlugRedirect).values({
            businessId: ticket.businessId,
            fromSlug: currentRow.slug,
            toSlug: nextSlug,
          });
          await transaction
            .update(business)
            .set({ slug: nextSlug, updatedAt: sql`now()` })
            .where(eq(business.id, ticket.businessId));
          await transaction
            .update(businessSite)
            .set({ platformPath: `/b/${nextSlug}`, updatedAt: sql`now()` })
            .where(eq(businessSite.businessId, ticket.businessId));
          break;
        }

        case "request_information":
          await transaction
            .update(businessTicket)
            .set({
              status: "awaiting_information",
              resolutionAction: input.action,
              resolutionNote: input.note.trim(),
              assignedToUserId: input.adminUserId,
              updatedAt: sql`now()`,
            })
            .where(eq(businessTicket.id, input.ticketId));
          await transaction.insert(businessTicketEvent).values({
            ticketId: input.ticketId,
            actorUserId: input.adminUserId,
            action: input.action,
            note: input.note.trim(),
          });
          return { status: "resolved" } as const;

        case "reject":
        case "dismiss":
        case "keep_separate":
          break;
      }

      const status =
        input.action === "reject"
          ? "rejected"
          : input.action === "dismiss"
            ? "dismissed"
            : input.action === "approve_claim" ||
                input.action === "add_manager" ||
                input.action === "transfer_control" ||
                input.action === "accept_correction" ||
                input.action === "approve_slug_change"
              ? "approved"
              : "resolved";

      await transaction
        .update(businessTicket)
        .set({
          status,
          resolutionAction: input.action,
          resolutionNote: input.note.trim(),
          assignedToUserId: input.adminUserId,
          resolvedByUserId: input.adminUserId,
          resolvedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(businessTicket.id, input.ticketId));
      await transaction.insert(businessTicketEvent).values({
        ticketId: input.ticketId,
        actorUserId: input.adminUserId,
        action: input.action,
        note: input.note.trim(),
      });
      return { status: "resolved" } as const;
    });

    if (result.status === "resolved") {
      await recordAdminAudit({
        actorUserId: input.adminUserId,
        action: "business.ticket_resolved",
        targetType: "business_ticket",
        targetId: input.ticketId,
        metadata: { action: input.action },
      });
    }
    return result;
  } catch {
    return { status: "unavailable" };
  }
}
