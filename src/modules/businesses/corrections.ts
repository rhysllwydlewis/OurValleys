import "server-only";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import {
  businessTicket,
  businessTicketEvent,
} from "@/lib/database/schema/business-operations";
import {
  OWNER_CORRECTION_NOTE_MAX,
  changedFields,
  parseSuggestionNotes,
  routesToOwner,
  type CorrectionChanges,
  type OwnerCorrectionDecision,
  type SuggestionNotes,
} from "./corrections-model";
import { safeCorrectionChanges } from "./tickets";

/**
 * Public corrections as the owner sees them. The reporter's email and account
 * are never returned: the owner decides on the suggestion, not on who sent it.
 */
export type OwnerCorrection = {
  id: string;
  /** The reason the visitor chose, e.g. `incorrect_details`. */
  reportReason: string;
  details: string;
  createdAt: Date;
  /** `open` for the owner to decide; `with_team` once handed to an admin. */
  state: "open" | "with_team" | "applied" | "handled" | "declined" | "closed";
  changes: CorrectionChanges;
  notes: SuggestionNotes;
  /** Proposed fields next to today's values (only while still open). */
  fields: ReturnType<typeof changedFields>;
  resolvedAt: Date | null;
  resolutionNote: string | null;
};

const RECENT_RESOLVED_LIMIT = 10;
const OPEN_LIMIT = 50;

function reportReasonOf(evidence: unknown): string {
  if (evidence && typeof evidence === "object" && !Array.isArray(evidence)) {
    const reason = (evidence as Record<string, unknown>).reportReason;
    if (typeof reason === "string") return reason;
  }
  return "other";
}

function stateOf(row: {
  status: string;
  riskLevel: string;
  resolutionAction: string | null;
}): OwnerCorrection["state"] {
  if (row.status === "open") {
    return row.riskLevel === "high" ? "with_team" : "open";
  }
  // An admin asked the reporter for more information: it is with the team too.
  if (row.status === "awaiting_information") return "with_team";
  switch (row.resolutionAction) {
    case "owner_applied":
      return "applied";
    case "owner_handled":
      return "handled";
    case "owner_declined":
      return "declined";
    default:
      return "closed";
  }
}

export type OwnerCorrectionList =
  | { state: "ready"; open: OwnerCorrection[]; recent: OwnerCorrection[] }
  | { state: "unavailable" };

/**
 * Corrections for one business. The caller has authorised the viewer for this
 * business. Rows are always filtered by `businessId`, so one business can
 * never read another's suggestions.
 */
export async function listOwnerCorrections(
  businessId: string,
): Promise<OwnerCorrectionList> {
  try {
    const database = getDatabase();
    const [current] = await database
      .select({
        publicPhone: business.publicPhone,
        publicEmail: business.publicEmail,
        summary: business.summary,
        description: business.description,
      })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);
    if (!current) return { state: "unavailable" };

    const columns = {
      id: businessTicket.id,
      reason: businessTicket.reason,
      evidence: businessTicket.evidence,
      riskLevel: businessTicket.riskLevel,
      status: businessTicket.status,
      resolutionAction: businessTicket.resolutionAction,
      resolutionNote: businessTicket.resolutionNote,
      createdAt: businessTicket.createdAt,
      resolvedAt: businessTicket.resolvedAt,
    };
    // Admin-only reports are filtered here, not after the limit, so a flood of
    // them can never push the owner's own suggestions out of the list.
    const ownerScope = and(
      eq(businessTicket.businessId, businessId),
      eq(businessTicket.type, "correction"),
      sql`coalesce(${businessTicket.evidence}->>'reportReason', 'other') in ('incorrect_details', 'closed_or_moved', 'other')`,
    );
    const [openRows, doneRows] = await Promise.all([
      database
        .select(columns)
        .from(businessTicket)
        .where(
          and(
            ownerScope,
            inArray(businessTicket.status, ["open", "awaiting_information"]),
          ),
        )
        .orderBy(desc(businessTicket.createdAt))
        .limit(OPEN_LIMIT),
      database
        .select(columns)
        .from(businessTicket)
        .where(
          and(
            ownerScope,
            notInArray(businessTicket.status, ["open", "awaiting_information"]),
          ),
        )
        .orderBy(desc(businessTicket.resolvedAt))
        .limit(RECENT_RESOLVED_LIMIT),
    ]);
    const rows = [...openRows, ...doneRows];

    const open: OwnerCorrection[] = [];
    const recent: OwnerCorrection[] = [];
    for (const row of rows) {
      const reportReason = reportReasonOf(row.evidence);
      // Defence in depth: the queries already exclude admin-only reports.
      if (!routesToOwner(reportReason)) continue;
      const evidence =
        row.evidence &&
        typeof row.evidence === "object" &&
        !Array.isArray(row.evidence)
          ? (row.evidence as Record<string, unknown>)
          : null;
      const changes = safeCorrectionChanges(evidence);
      const state = stateOf(row);
      const item: OwnerCorrection = {
        id: row.id,
        reportReason,
        details: row.reason,
        createdAt: row.createdAt,
        state,
        changes,
        notes: parseSuggestionNotes(evidence?.notes),
        fields:
          state === "open" || state === "with_team"
            ? changedFields(changes, current)
            : [],
        resolvedAt: row.resolvedAt,
        resolutionNote: row.resolutionNote,
      };
      if (state === "open" || state === "with_team") {
        open.push(item);
      } else {
        recent.push(item);
      }
    }
    return { state: "ready", open, recent };
  } catch {
    return { state: "unavailable" };
  }
}

/** How many suggestions are waiting for the owner (not those with the team). */
export async function countOpenOwnerCorrections(
  businessId: string,
): Promise<number> {
  try {
    const [row] = await getDatabase()
      .select({ count: sql<number>`count(*)::int` })
      .from(businessTicket)
      .where(
        and(
          eq(businessTicket.businessId, businessId),
          eq(businessTicket.type, "correction"),
          eq(businessTicket.status, "open"),
          eq(businessTicket.riskLevel, "standard"),
          sql`coalesce(${businessTicket.evidence}->>'reportReason', 'other') in ('incorrect_details', 'closed_or_moved', 'other')`,
        ),
      );
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

export type ResolveOwnerCorrectionResult =
  | { status: "applied" | "handled" | "declined" | "escalated" }
  | { status: "invalid"; reason: "note_too_long" | "nothing_to_apply" }
  | { status: "not_found" }
  | { status: "not_open" }
  | { status: "unavailable" };

/**
 * The owner's decision on one suggestion, in one transaction. The ticket must
 * belong to `businessId`, be a correction and still be open with standard
 * risk, so a ticket id from another business, a finished ticket or a report
 * that is admin-only is "not found" or "not open" and nothing changes.
 * "Apply" writes only the structured public fields the visitor proposed
 * (phone, email, summary, description), never the free-text hours or address.
 * Every outcome is recorded in the ticket history.
 */
export async function resolveOwnerCorrection(input: {
  businessId: string;
  ticketId: string;
  actorUserId: string;
  decision: OwnerCorrectionDecision;
  note?: string;
}): Promise<ResolveOwnerCorrectionResult> {
  const note = (input.note ?? "").trim();
  if (note.length > OWNER_CORRECTION_NOTE_MAX) {
    return { status: "invalid", reason: "note_too_long" };
  }

  try {
    return await getDatabase().transaction(async (transaction) => {
      const [ticket] = await transaction
        .select()
        .from(businessTicket)
        .where(
          and(
            eq(businessTicket.id, input.ticketId),
            eq(businessTicket.businessId, input.businessId),
            eq(businessTicket.type, "correction"),
          ),
        )
        .for("update")
        .limit(1);
      if (!ticket) return { status: "not_found" } as const;

      const evidence =
        ticket.evidence &&
        typeof ticket.evidence === "object" &&
        !Array.isArray(ticket.evidence)
          ? (ticket.evidence as Record<string, unknown>)
          : null;
      if (
        ticket.status !== "open" ||
        ticket.riskLevel !== "standard" ||
        !routesToOwner(reportReasonOf(evidence))
      ) {
        return { status: "not_open" } as const;
      }

      if (input.decision === "escalate") {
        await transaction
          .update(businessTicket)
          .set({ riskLevel: "high", updatedAt: sql`now()` })
          .where(eq(businessTicket.id, ticket.id));
        await transaction.insert(businessTicketEvent).values({
          ticketId: ticket.id,
          actorUserId: input.actorUserId,
          action: "owner_escalated",
          note: note || null,
        });
        return { status: "escalated" } as const;
      }

      let status: "approved" | "resolved" | "rejected";
      let resolutionAction: string;
      if (input.decision === "apply") {
        const changes = safeCorrectionChanges(evidence);
        if (Object.keys(changes).length === 0) {
          return { status: "invalid", reason: "nothing_to_apply" } as const;
        }
        await transaction
          .update(business)
          .set({ ...changes, updatedAt: sql`now()` })
          .where(eq(business.id, input.businessId));
        status = "approved";
        resolutionAction = "owner_applied";
      } else if (input.decision === "handled") {
        status = "resolved";
        resolutionAction = "owner_handled";
      } else {
        status = "rejected";
        resolutionAction = "owner_declined";
      }

      const resolutionNote =
        note ||
        (input.decision === "apply"
          ? "Applied by the business."
          : input.decision === "handled"
            ? "Marked as handled by the business."
            : "Declined by the business.");
      await transaction
        .update(businessTicket)
        .set({
          status,
          resolutionAction,
          resolutionNote,
          resolvedByUserId: input.actorUserId,
          resolvedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(businessTicket.id, ticket.id),
            inArray(businessTicket.status, ["open"]),
          ),
        );
      await transaction.insert(businessTicketEvent).values({
        ticketId: ticket.id,
        actorUserId: input.actorUserId,
        action: resolutionAction,
        note: resolutionNote,
      });
      return {
        status:
          input.decision === "apply"
            ? "applied"
            : input.decision === "handled"
              ? "handled"
              : "declined",
      } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}
