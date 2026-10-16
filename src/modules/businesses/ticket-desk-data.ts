import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, businessMembership } from "@/lib/database/schema/business";
import {
  businessTicket,
  businessTicketEvent,
} from "@/lib/database/schema/business-operations";
import {
  businessTicketTypes,
  type BusinessTicketType,
  type BusinessTicketView,
} from "./tickets";
import type { CurrentPublicValues } from "./ticket-desk";

export type TicketPerson = {
  userId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  memberSince: Date;
};

export type TicketTeamMember = {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export type TicketHistoryEntry = {
  id: string;
  action: string;
  note: string | null;
  actorName: string | null;
  createdAt: Date;
};

export type TicketDeskDetail = {
  ticket: BusinessTicketView & { resolvedByName: string | null };
  business: {
    id: string;
    name: string;
    slug: string;
    status: string;
    claimStatus: string;
    current: CurrentPublicValues;
  };
  related: {
    id: string;
    name: string;
    slug: string;
    status: string;
    teamCount: number;
  } | null;
  claimant: TicketPerson | null;
  team: TicketTeamMember[];
  /** Safety facts, counted over every membership rather than the capped list. */
  activeOwnerCount: number;
  claimantMembership: { role: string; status: string } | null;
  otherOpenTickets: {
    id: string;
    type: BusinessTicketType;
    createdAt: Date;
  }[];
  history: TicketHistoryEntry[];
};

export type TicketDeskDetailResult =
  | { state: "ready"; detail: TicketDeskDetail }
  | { state: "missing" }
  | { state: "unavailable" };

/**
 * Everything the resolution desk shows for one ticket. Read-only, and for
 * platform admins only: it returns team members' and the claimant's email
 * addresses, so callers must have checked an admin session first.
 */
export async function getTicketDeskDetail(
  ticketId: string,
): Promise<TicketDeskDetailResult> {
  try {
    const database = getDatabase();
    const related = alias(business, "related_business");
    const resolver = alias(user, "resolver");

    const [row] = await database
      .select({
        ticket: businessTicket,
        businessName: business.tradingName,
        businessSlug: business.slug,
        businessStatus: business.status,
        claimStatus: business.claimStatus,
        publicPhone: business.publicPhone,
        publicEmail: business.publicEmail,
        summary: business.summary,
        description: business.description,
        relatedName: related.tradingName,
        relatedSlug: related.slug,
        relatedStatus: related.status,
        resolvedByName: resolver.name,
      })
      .from(businessTicket)
      .innerJoin(business, eq(business.id, businessTicket.businessId))
      .leftJoin(related, eq(related.id, businessTicket.relatedBusinessId))
      .leftJoin(resolver, eq(resolver.id, businessTicket.resolvedByUserId))
      .where(eq(businessTicket.id, ticketId))
      .limit(1);
    if (
      !row ||
      !(businessTicketTypes as readonly string[]).includes(row.ticket.type)
    ) {
      return { state: "missing" };
    }
    const ticket = row.ticket;

    const [
      team,
      claimantRows,
      others,
      history,
      relatedTeam,
      owners,
      claimantMember,
    ] = await Promise.all([
      database
        .select({
          userId: businessMembership.userId,
          name: user.name,
          email: user.email,
          role: businessMembership.role,
          status: businessMembership.status,
        })
        .from(businessMembership)
        .innerJoin(user, eq(user.id, businessMembership.userId))
        .where(eq(businessMembership.businessId, ticket.businessId))
        .orderBy(asc(businessMembership.createdAt))
        .limit(50),
      ticket.reporterUserId
        ? database
            .select({
              userId: user.id,
              name: user.name,
              email: user.email,
              emailVerified: user.emailVerified,
              memberSince: user.createdAt,
            })
            .from(user)
            .where(eq(user.id, ticket.reporterUserId))
            .limit(1)
        : Promise.resolve([]),
      database
        .select({
          id: businessTicket.id,
          type: businessTicket.type,
          createdAt: businessTicket.createdAt,
        })
        .from(businessTicket)
        .where(
          and(
            eq(businessTicket.businessId, ticket.businessId),
            ne(businessTicket.id, ticket.id),
            inArray(businessTicket.status, ["open", "awaiting_information"]),
          ),
        )
        .orderBy(asc(businessTicket.createdAt))
        .limit(10),
      database
        .select({
          id: businessTicketEvent.id,
          action: businessTicketEvent.action,
          note: businessTicketEvent.note,
          actorName: user.name,
          createdAt: businessTicketEvent.createdAt,
        })
        .from(businessTicketEvent)
        .leftJoin(user, eq(user.id, businessTicketEvent.actorUserId))
        .where(eq(businessTicketEvent.ticketId, ticket.id))
        .orderBy(desc(businessTicketEvent.createdAt))
        .limit(50),
      ticket.relatedBusinessId
        ? database
            .select({ total: count() })
            .from(businessMembership)
            .where(eq(businessMembership.businessId, ticket.relatedBusinessId))
        : Promise.resolve([]),
      database
        .select({ total: count() })
        .from(businessMembership)
        .where(
          and(
            eq(businessMembership.businessId, ticket.businessId),
            eq(businessMembership.role, "owner"),
            eq(businessMembership.status, "active"),
          ),
        ),
      ticket.reporterUserId
        ? database
            .select({
              role: businessMembership.role,
              status: businessMembership.status,
            })
            .from(businessMembership)
            .where(
              and(
                eq(businessMembership.businessId, ticket.businessId),
                eq(businessMembership.userId, ticket.reporterUserId),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
    ]);

    return {
      state: "ready",
      detail: {
        ticket: {
          id: ticket.id,
          businessId: ticket.businessId,
          businessName: row.businessName,
          relatedBusinessId: ticket.relatedBusinessId,
          relatedBusinessName: row.relatedName,
          reporterUserId: ticket.reporterUserId,
          reporterEmail: ticket.reporterEmail,
          type: ticket.type as BusinessTicketType,
          reason: ticket.reason,
          evidence: (ticket.evidence as Record<string, unknown> | null) ?? null,
          riskLevel: ticket.riskLevel === "high" ? "high" : "standard",
          status: ticket.status,
          resolutionAction: ticket.resolutionAction,
          resolutionNote: ticket.resolutionNote,
          createdAt: ticket.createdAt,
          resolvedAt: ticket.resolvedAt,
          resolvedByName: row.resolvedByName,
        },
        business: {
          id: ticket.businessId,
          name: row.businessName,
          slug: row.businessSlug,
          status: row.businessStatus,
          claimStatus: row.claimStatus,
          current: {
            publicPhone: row.publicPhone,
            publicEmail: row.publicEmail,
            summary: row.summary,
            description: row.description,
          },
        },
        related:
          ticket.relatedBusinessId && row.relatedName && row.relatedSlug
            ? {
                id: ticket.relatedBusinessId,
                name: row.relatedName,
                slug: row.relatedSlug,
                status: row.relatedStatus ?? "unknown",
                teamCount: relatedTeam[0]?.total ?? 0,
              }
            : null,
        claimant: claimantRows[0] ?? null,
        team,
        activeOwnerCount: owners[0]?.total ?? 0,
        claimantMembership: claimantMember[0] ?? null,
        otherOpenTickets: others
          .filter((other) =>
            (businessTicketTypes as readonly string[]).includes(other.type),
          )
          .map((other) => ({
            id: other.id,
            type: other.type as BusinessTicketType,
            createdAt: other.createdAt,
          })),
        history,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}

export type TicketListScope = "active" | "closed" | "all";

export function parseTicketListScope(value: unknown): TicketListScope {
  return value === "closed" || value === "all" ? value : "active";
}

const activeStatuses = ["open", "awaiting_information"];
const closedStatuses = ["approved", "rejected", "resolved", "dismissed"];

/**
 * Tickets for the desk list. Active tickets are never truncated by closed
 * ones: each scope has its own query and cap, and "all" reads both.
 */
export async function listTicketsForDesk(
  scope: TicketListScope,
): Promise<{ state: "ready" | "unavailable"; tickets: BusinessTicketView[] }> {
  try {
    const database = getDatabase();
    const related = alias(business, "related_business");
    const select = () =>
      database
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
        .leftJoin(related, eq(related.id, businessTicket.relatedBusinessId));

    const [active, closed] = await Promise.all([
      scope === "closed"
        ? Promise.resolve([])
        : select()
            .where(inArray(businessTicket.status, activeStatuses))
            // High risk first, then oldest, so the cap can never hide urgent work.
            .orderBy(
              desc(sql`(${businessTicket.riskLevel} = 'high')`),
              asc(businessTicket.createdAt),
            )
            .limit(300),
      scope === "active"
        ? Promise.resolve([])
        : select()
            .where(inArray(businessTicket.status, closedStatuses))
            .orderBy(
              desc(
                sql`coalesce(${businessTicket.resolvedAt}, ${businessTicket.updatedAt})`,
              ),
            )
            .limit(100),
    ]);

    return {
      state: "ready",
      tickets: [...active, ...closed]
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
