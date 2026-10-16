/**
 * The admin resolution desk for claim, duplicate, correction and web-address
 * tickets. This module is pure (no database, no framework): it ranks tickets,
 * turns stored evidence into labelled facts, and says in plain words what each
 * allowed action will do. It never decides anything; the audited
 * `resolveBusinessTicket` remains the only code that changes records, and its
 * rules for which action fits which ticket are mirrored here for display only.
 */
import {
  ageInHours,
  urgencyFor,
  type ReviewDeskUrgency,
} from "@/modules/admin/review-desk";
import { z } from "zod";
import { slugifyBusinessName } from "./slug";
import type { BusinessTicketType, TicketResolutionAction } from "./tickets";

export const ticketTypeLabels: Record<BusinessTicketType, string> = {
  claim: "Ownership claim",
  duplicate: "Possible duplicate",
  correction: "Public correction",
  slug_change: "Web address change",
};

export const ticketStatuses = [
  "open",
  "awaiting_information",
  "approved",
  "rejected",
  "resolved",
  "dismissed",
] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Open",
  awaiting_information: "Awaiting information",
  approved: "Approved",
  rejected: "Rejected",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export function parseTicketStatus(value: unknown): TicketStatus | null {
  return typeof value === "string" &&
    (ticketStatuses as readonly string[]).includes(value)
    ? (value as TicketStatus)
    : null;
}

export function isTerminalTicketStatus(status: string): boolean {
  return ["approved", "rejected", "resolved", "dismissed"].includes(status);
}

export const resolutionActionLabels: Record<TicketResolutionAction, string> = {
  approve_claim: "Approve claim as manager",
  add_manager: "Add claimant as manager",
  transfer_control: "Make claimant the owner",
  keep_separate: "Keep the records separate",
  merge_duplicate: "Retire duplicate and redirect",
  restore_duplicate: "Restore retired duplicate",
  accept_correction: "Accept correction",
  approve_slug_change: "Approve new web address",
  request_information: "Ask for more information",
  reject: "Reject",
  dismiss: "Dismiss with no action",
};

/* ----------------------------------------------------------- ranking */

export type RankableTicket = {
  id: string;
  type: BusinessTicketType;
  status: string;
  riskLevel: "standard" | "high";
  createdAt: Date;
  resolvedAt?: Date | null;
};

export type RankedTicket<T extends RankableTicket> = T & {
  ageHours: number;
  /** Null once a ticket is closed or paused waiting on someone else. */
  urgency: ReviewDeskUrgency | null;
};

/**
 * Tickets that need an admin come first: high risk, then overdue, then due
 * soon, then oldest. Tickets paused for information follow, and closed tickets
 * come last, newest first, so history reads like a log.
 */
export function rankTickets<T extends RankableTicket>(
  tickets: readonly T[],
  now: Date,
): RankedTicket<T>[] {
  const group = (ticket: T): number =>
    ticket.status === "open"
      ? 0
      : ticket.status === "awaiting_information"
        ? 1
        : 2;
  const urgencyRank = { overdue: 2, due_soon: 1, on_track: 0 } as const;

  return tickets
    .map((ticket) => {
      const ageHours = ageInHours(ticket.createdAt, now);
      return {
        ...ticket,
        ageHours,
        urgency:
          ticket.status === "open"
            ? urgencyFor("ticket", ticket.riskLevel, ageHours)
            : null,
      };
    })
    .sort((a, b) => {
      const groupA = group(a);
      const groupB = group(b);
      if (groupA !== groupB) return groupA - groupB;
      if (groupA === 2) {
        const decided = (ticket: T) =>
          (ticket.resolvedAt ?? ticket.createdAt).getTime();
        return decided(b) - decided(a) || a.id.localeCompare(b.id);
      }
      return (
        (b.riskLevel === "high" ? 1 : 0) - (a.riskLevel === "high" ? 1 : 0) ||
        (b.urgency ? urgencyRank[b.urgency] : 0) -
          (a.urgency ? urgencyRank[a.urgency] : 0) ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id)
      );
    });
}

export type TicketSummary = {
  open: number;
  awaitingInformation: number;
  overdue: number;
  highRisk: number;
  byType: Record<BusinessTicketType, number>;
};

/** Counts over the tickets that still need work (open or paused). */
export function summariseTickets(
  tickets: readonly RankedTicket<RankableTicket>[],
): TicketSummary {
  const summary: TicketSummary = {
    open: 0,
    awaitingInformation: 0,
    overdue: 0,
    highRisk: 0,
    byType: { claim: 0, duplicate: 0, correction: 0, slug_change: 0 },
  };
  for (const ticket of tickets) {
    if (isTerminalTicketStatus(ticket.status)) continue;
    if (ticket.status === "awaiting_information") {
      summary.awaitingInformation += 1;
    } else {
      summary.open += 1;
      if (ticket.urgency === "overdue") summary.overdue += 1;
    }
    if (ticket.riskLevel === "high") summary.highRisk += 1;
    summary.byType[ticket.type] += 1;
  }
  return summary;
}

/* ---------------------------------------------------------- evidence */

export type EvidenceRow = { label: string; value: string };

const evidenceLabels: Record<string, string> = {
  claimedRole: "Claimant says they are",
  website: "Website given",
  phone: "Phone given",
  note: "Supporting note",
  reportReason: "Report reason",
  proposedSlug: "Proposed web address",
  currentSlug: "Current web address",
};

/** Keys shown elsewhere (as a comparison, snapshot or machine bookkeeping). */
const evidenceKeysShownElsewhere = new Set([
  "changes",
  "relatedSnapshot",
  "mergedMembershipUserIds",
]);

function evidenceValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.slice(0, 600);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function humaniseKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export type DescribedEvidence = {
  rows: EvidenceRow[];
  /** Anything with a shape we do not label, for the "all details" fold-out. */
  other: Record<string, unknown> | null;
};

export function describeEvidence(
  evidence: Record<string, unknown> | null,
): DescribedEvidence {
  if (!evidence) return { rows: [], other: null };
  const rows: EvidenceRow[] = [];
  const other: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(evidence)) {
    if (evidenceKeysShownElsewhere.has(key)) continue;
    const text = evidenceValue(raw);
    if (text === null) {
      if (raw !== null && raw !== undefined && raw !== "") other[key] = raw;
      continue;
    }
    rows.push({
      label: evidenceLabels[key] ?? humaniseKey(key),
      value: key === "reportReason" ? text.replaceAll("_", " ") : text,
    });
  }
  return {
    rows,
    other: Object.keys(other).length > 0 ? other : null,
  };
}

/* ------------------------------------------------------- corrections */

export const correctableFields = [
  "publicPhone",
  "publicEmail",
  "summary",
  "description",
] as const;
export type CorrectableField = (typeof correctableFields)[number];

export const correctableFieldLabels: Record<CorrectableField, string> = {
  publicPhone: "Public phone",
  publicEmail: "Public email",
  summary: "Short summary",
  description: "Description",
};

export type CurrentPublicValues = Record<CorrectableField, string | null>;

export type CorrectionRow = {
  field: CorrectableField;
  label: string;
  current: string | null;
  proposed: string | null;
  /** False when the proposal equals what is already public. */
  changes: boolean;
};

/** The proposed values a correction ticket carries, restricted to known fields. */
export function proposedCorrections(
  evidence: Record<string, unknown> | null,
): Partial<Record<CorrectableField, string | null>> {
  const changes = evidence?.changes;
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    return {};
  }
  const record = changes as Record<string, unknown>;
  const result: Partial<Record<CorrectableField, string | null>> = {};
  // The same limits and validation as `safeCorrectionChanges`, so the desk
  // never promises a value the service would drop or shorten silently.
  const limits: Record<CorrectableField, number> = {
    publicPhone: 30,
    publicEmail: 254,
    summary: 240,
    description: 5000,
  };
  for (const field of correctableFields) {
    const value = record[field];
    if (field === "publicPhone" && value === null) result[field] = null;
    else if (field === "publicEmail" && value === null) result[field] = null;
    else if (typeof value === "string") {
      if (field === "publicEmail" && !z.email().safeParse(value).success) {
        continue;
      }
      const text = value.trim().slice(0, limits[field]);
      result[field] = field === "publicPhone" ? text || null : text;
    }
  }
  return result;
}

export function correctionRows(
  evidence: Record<string, unknown> | null,
  current: CurrentPublicValues,
): CorrectionRow[] {
  const proposed = proposedCorrections(evidence);
  return correctableFields
    .filter((field) => field in proposed)
    .map((field) => {
      const next = proposed[field] ?? null;
      const now = current[field];
      return {
        field,
        label: correctableFieldLabels[field],
        current: now,
        proposed: next,
        changes: (next ?? "") !== (now ?? ""),
      };
    });
}

export function proposedSlugFromEvidence(
  evidence: Record<string, unknown> | null,
): string | null {
  const raw = evidence?.proposedSlug;
  if (typeof raw !== "string") return null;
  return slugifyBusinessName(raw) || null;
}

/* ----------------------------------------------------- action guide */

export type ActionTone = "primary" | "neutral" | "danger";

export type ActionOption = {
  action: TicketResolutionAction;
  label: string;
  /** One line that says what choosing this does. */
  summary: string;
  /** Each concrete change to records, in plain words. */
  effects: string[];
  tone: ActionTone;
  recommended: boolean;
  /** True when the action changes business, account or publication records. */
  changesRecords: boolean;
  /** Extra warning about who reads the note, when it is not only admins. */
  noteWarning: string | null;
  /** When set the action is shown but cannot be chosen, and why. */
  blockedReason: string | null;
};

export type ActionGuideInput = {
  type: BusinessTicketType;
  status: string;
  resolutionAction: string | null;
  businessName: string;
  businessSlug: string;
  relatedBusinessName: string | null;
  hasRelatedBusiness: boolean;
  claimantName: string | null;
  hasClaimant: boolean;
  claimantAlreadyManages: boolean;
  /** The claimant is an active owner today (granting manager would demote them). */
  claimantIsOwner: boolean;
  /** The claimant has a suspended or revoked membership that would be reactivated. */
  claimantHasInactiveMembership: boolean;
  /** Active owners of the business now. */
  currentOwnerCount: number;
  evidence: Record<string, unknown> | null;
  current: CurrentPublicValues;
};

const closeWithoutChange = [
  "No business, account or publication record is changed.",
  "The ticket closes and your note is kept in its history and the audit log.",
];

function quote(value: string | null): string {
  return value
    ? `“${value.length > 60 ? `${value.slice(0, 57)}…` : value}”`
    : "empty";
}

/**
 * The actions an admin can take on this ticket, with what each one will do and
 * a gentle recommendation. Mirrors the rules in `resolveBusinessTicket`; the
 * service stays the authority and will refuse anything this list gets wrong.
 */
export function actionGuide(input: ActionGuideInput): ActionOption[] {
  return buildActionGuide(input).map((option) => ({
    ...option,
    changesRecords: !noRecordChange.has(option.action),
    noteWarning:
      option.action === "request_information" && input.type === "slug_change"
        ? "The owner can see this note next to their address request. Do not put internal reasoning in it."
        : null,
  }));
}

const noRecordChange = new Set<TicketResolutionAction>([
  "request_information",
  "reject",
  "dismiss",
  "keep_separate",
]);

type GuideOption = Omit<ActionOption, "changesRecords" | "noteWarning">;

function buildActionGuide(input: ActionGuideInput): GuideOption[] {
  const terminal = isTerminalTicketStatus(input.status);

  if (terminal) {
    if (
      input.type === "duplicate" &&
      input.hasRelatedBusiness &&
      input.resolutionAction === "merge_duplicate"
    ) {
      return [
        {
          action: "restore_duplicate",
          label: resolutionActionLabels.restore_duplicate,
          summary: "Undo the merge if it was a mistake.",
          effects: [
            `${input.relatedBusinessName ?? "The retired business"} returns to the status it had before the merge.`,
            "Team members added to this business by the merge are removed again.",
            "Its old web address stops redirecting and returns to whatever availability it had before (a draft stays unpublished).",
          ],
          tone: "danger",
          recommended: false,
          blockedReason: null,
        },
      ];
    }
    return [];
  }

  const options: GuideOption[] = [];
  const claimantLabel = input.claimantName ?? "The claimant";

  if (input.type === "claim") {
    const noClaimant =
      "This claim is not attached to a signed-in account, so access cannot be granted.";
    const blocked = input.hasClaimant ? null : noClaimant;
    const alreadyOwner = input.claimantIsOwner
      ? "The claimant already owns this business; granting manager access would demote them."
      : null;
    const ownerless = input.currentOwnerCount === 0;
    options.push(
      {
        action: "transfer_control",
        label: resolutionActionLabels.transfer_control,
        summary: ownerless
          ? "No one owns this business yet, so the claimant becomes its owner."
          : "Hand ownership to the claimant. The current owner becomes a manager.",
        effects: [
          `${claimantLabel} becomes owner with every business permission.`,
          input.currentOwnerCount > 0
            ? `${input.currentOwnerCount === 1 ? "The current owner" : `The ${input.currentOwnerCount} current owners`} become${input.currentOwnerCount === 1 ? "s a manager" : " managers"}.`
            : "Nobody loses access.",
          "The business is marked as claimed.",
        ],
        tone: ownerless ? "primary" : "danger",
        recommended: ownerless && input.hasClaimant,
        blockedReason: blocked,
      },
      {
        action: "approve_claim",
        label: resolutionActionLabels.approve_claim,
        summary: "Give the claimant manager access and keep any current owner.",
        effects: [
          input.claimantAlreadyManages
            ? `${claimantLabel} already has access; their role is set to manager.`
            : `${claimantLabel} joins the team as a manager.`,
          "Any other owner keeps control.",
          ...(input.claimantHasInactiveMembership
            ? ["Their suspended or removed access is switched back on."]
            : []),
          "The business is marked as claimed.",
        ],
        tone: "neutral",
        recommended: false,
        blockedReason: blocked ?? alreadyOwner,
      },
      {
        action: "add_manager",
        label: resolutionActionLabels.add_manager,
        summary: "Same change as approving, for a request to help run it.",
        effects: [
          `${claimantLabel} becomes a manager; nobody else's access changes.`,
          ...(input.claimantHasInactiveMembership
            ? ["Their suspended or removed access is switched back on."]
            : []),
          "The business is marked as claimed.",
        ],
        tone: "neutral",
        recommended: false,
        blockedReason: blocked ?? alreadyOwner,
      },
    );
  }

  if (input.type === "duplicate") {
    const related = input.relatedBusinessName ?? "the related business";
    const blocked = input.hasRelatedBusiness
      ? null
      : "No related business is recorded on this ticket.";
    options.push(
      {
        action: "merge_duplicate",
        label: resolutionActionLabels.merge_duplicate,
        summary: `Treat ${related} as a copy of ${input.businessName}.`,
        effects: [
          `${related} is removed from the directory and its website is taken down.`,
          `Its old web address redirects to /b/${input.businessSlug}.`,
          "Everyone on its team, whatever their status there, gets active access here (an owner there becomes a manager here). Check its team first.",
          "You can undo this afterwards with “Restore retired duplicate”.",
        ],
        tone: "danger",
        recommended: false,
        blockedReason: blocked,
      },
      {
        action: "keep_separate",
        label: resolutionActionLabels.keep_separate,
        summary: "They are different businesses; leave both as they are.",
        effects: closeWithoutChange,
        tone: "neutral",
        recommended: false,
        blockedReason: null,
      },
    );
  }

  if (input.type === "correction") {
    const rows = correctionRows(input.evidence, input.current);
    const changing = rows.filter((row) => row.changes);
    options.push({
      action: "accept_correction",
      label: resolutionActionLabels.accept_correction,
      summary:
        changing.length > 0
          ? `Apply ${changing.length === 1 ? "the proposed change" : `all ${changing.length} proposed changes`} to the public page.`
          : "There is no proposed value that differs from the public page.",
      effects:
        changing.length > 0
          ? changing.map(
              (row) =>
                `${row.label}: ${quote(row.current)} becomes ${quote(row.proposed)}.`,
            )
          : [],
      tone: "primary",
      recommended: changing.length > 0,
      blockedReason:
        rows.length === 0
          ? "This report carries no structured change to apply. Ask for more information or reject it."
          : null,
    });
  }

  if (input.type === "slug_change") {
    const next = proposedSlugFromEvidence(input.evidence);
    options.push({
      action: "approve_slug_change",
      label: resolutionActionLabels.approve_slug_change,
      summary: next
        ? `Move the website from /b/${input.businessSlug} to /b/${next}.`
        : "No valid web address was proposed.",
      effects: next
        ? [
            `The business page moves to /b/${next}.`,
            `/b/${input.businessSlug} keeps working as a permanent redirect, so existing links and QR codes still arrive.`,
            "The request is refused if the address is already taken.",
          ]
        : [],
      tone: "primary",
      recommended: Boolean(next),
      blockedReason: next ? null : "The ticket has no valid proposed address.",
    });
  }

  options.push(
    {
      action: "request_information",
      label: resolutionActionLabels.request_information,
      summary: "Pause the ticket while you get the missing details.",
      effects: [
        "The ticket moves to “awaiting information”; no records change.",
        ...(input.type === "slug_change"
          ? [
              "The owner can see your note next to their address request, so write it for them.",
            ]
          : []),
        "Nothing is sent automatically. Contact the reporter yourself if you need to.",
        "It stays in “Needs action”, below open tickets, until you decide.",
      ],
      tone: "neutral",
      recommended:
        input.type === "claim" &&
        input.hasClaimant &&
        input.currentOwnerCount > 0,
      blockedReason: null,
    },
    {
      action: "reject",
      label: resolutionActionLabels.reject,
      summary: "The request is not accepted.",
      effects: closeWithoutChange,
      tone: "danger",
      recommended: false,
      blockedReason: null,
    },
    {
      action: "dismiss",
      label: resolutionActionLabels.dismiss,
      summary: "No action is needed (spam, a repeat, or already handled).",
      effects: closeWithoutChange,
      tone: "neutral",
      recommended: false,
      blockedReason: null,
    },
  );

  return options;
}

/** Flags worth a second look before acting; shown above the actions. */
export function ticketCautions(input: {
  type: BusinessTicketType;
  status: string;
  hasClaimant: boolean;
  claimantAlreadyManages: boolean;
  claimantEmailVerified: boolean | null;
  currentOwnerCount: number;
  otherOpenTicketCount: number;
}): string[] {
  const cautions: string[] = [];
  if (isTerminalTicketStatus(input.status)) return cautions;
  if (input.type === "claim") {
    if (!input.hasClaimant) {
      cautions.push(
        "The claimant's account no longer exists, so access cannot be granted.",
      );
    } else {
      if (input.claimantEmailVerified === false) {
        cautions.push("The claimant has not verified their email address.");
      }
      if (input.claimantAlreadyManages) {
        cautions.push("The claimant already has access to this business.");
      }
    }
    if (input.currentOwnerCount > 0) {
      cautions.push(
        "This business already has an owner. Changing control is a conflict: check the evidence, and consider asking the owner.",
      );
    }
  }
  if (input.otherOpenTicketCount > 0) {
    cautions.push(
      `${input.otherOpenTicketCount === 1 ? "Another ticket is" : `${input.otherOpenTicketCount} other tickets are`} also waiting on this business.`,
    );
  }
  return cautions;
}
