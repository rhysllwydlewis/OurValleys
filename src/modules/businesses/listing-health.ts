import "server-only";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import {
  changeBusinessLifecycle,
  configureAutomaticPublication,
  configureLifecycleEmails,
  confirmBusinessTrading,
  ensureBusinessLifecycle,
  type LifecycleView,
} from "./lifecycle-automation";
import {
  nameConfirmationMatches,
  nameConfirmedActions,
  ownerOnlyActions,
  parseClosureDate,
  type ListingAction,
} from "./listing-health-model";
import { configureWeeklyDigest } from "./owner-digest";
import { getUserBusinessRole } from "./permissions";

export type ListingFacts = {
  tradingName: string;
  /** The `business.status` column: draft, pending review, published, paused... */
  publicationStatus: string;
  lifecycle: LifecycleView;
};

/** What the Listing tab shows, or null when the business or its lifecycle cannot be read. */
export async function readListingFacts(
  businessId: string,
): Promise<ListingFacts | null> {
  try {
    const [row] = await getDatabase()
      .select({ tradingName: business.tradingName, status: business.status })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);
    if (!row) return null;
    const lifecycle = await ensureBusinessLifecycle(businessId);
    if (!lifecycle) return null;
    return {
      tradingName: row.tradingName,
      publicationStatus: row.status,
      lifecycle,
    };
  } catch {
    return null;
  }
}

export type ListingActionOutcome =
  | "confirmed"
  | "paused"
  | "resumed"
  | "closed_temporarily"
  | "closed_permanently"
  | "deletion_requested"
  | "deletion_cancelled"
  | "forbidden"
  | "not_found"
  | "unavailable"
  | "date_required"
  | "date_invalid"
  | "date_past"
  | "date_too_far"
  | "name_mismatch";

const doneOutcomes: Record<
  Exclude<ListingAction, "confirm">,
  ListingActionOutcome
> = {
  pause: "paused",
  resume: "resumed",
  temporary_close: "closed_temporarily",
  permanent_close: "closed_permanently",
  request_deletion: "deletion_requested",
  cancel_deletion: "deletion_cancelled",
};

/**
 * Runs one lifecycle action for a member who has already passed the
 * `manageLifecycle` check. The service re-checks that permission in its own
 * transaction; this adds the owner-only rule early so the refusal is named,
 * the typed-name confirmation for the two actions that are hard to undo, and
 * the dated closure.
 */
export async function applyListingAction(input: {
  businessId: string;
  actorUserId: string;
  action: ListingAction;
  /** `YYYY-MM-DD`, for a temporary closure. */
  closureDate?: string;
  /** What the member typed to confirm closing or deleting. */
  confirmName?: string;
  now?: Date;
}): Promise<ListingActionOutcome> {
  const now = input.now ?? new Date();
  const { businessId, actorUserId, action } = input;

  if (action === "confirm") {
    const result = await confirmBusinessTrading({
      businessId,
      actorUserId,
      now,
    });
    return result === "confirmed" ? "confirmed" : "unavailable";
  }

  if (ownerOnlyActions.includes(action)) {
    const role = await getUserBusinessRole({
      userId: actorUserId,
      businessId,
    });
    if (role !== "owner") return "forbidden";
  }

  if (nameConfirmedActions.includes(action)) {
    const facts = await readListingFacts(businessId);
    if (!facts) return "not_found";
    if (!nameConfirmationMatches(input.confirmName ?? "", facts.tradingName)) {
      return "name_mismatch";
    }
  }

  let closureUntil: Date | null = null;
  if (action === "temporary_close") {
    const parsed = parseClosureDate(input.closureDate ?? "", now);
    if (!parsed.ok) {
      return (
        {
          required: "date_required",
          invalid: "date_invalid",
          past: "date_past",
          too_far: "date_too_far",
        } as const
      )[parsed.reason];
    }
    closureUntil = parsed.until;
  }

  const result = await changeBusinessLifecycle({
    businessId,
    actorUserId,
    action,
    temporaryClosedUntil: closureUntil,
  });
  if (result === "updated") return doneOutcomes[action];
  if (result === "invalid") return "date_invalid";
  return result;
}

export type ReminderPreferences = {
  autoPublish: boolean;
  lifecycleEmails: boolean;
  weeklyDigest: boolean;
};

/**
 * Saves the reminder switches that changed. Switching automatic publication on
 * again while it is already on would restart its 14-day countdown, so only
 * differences are written.
 */
export async function saveReminderPreferences(input: {
  businessId: string;
  preferences: ReminderPreferences;
}): Promise<"updated" | "unavailable"> {
  const current = await ensureBusinessLifecycle(input.businessId);
  if (!current) return "unavailable";
  const { preferences, businessId } = input;
  const results: string[] = [];
  if (preferences.autoPublish !== current.autoPublishEnabled) {
    results.push(
      await configureAutomaticPublication({
        businessId,
        enabled: preferences.autoPublish,
      }),
    );
  }
  if (preferences.lifecycleEmails !== current.lifecycleEmailsEnabled) {
    results.push(
      await configureLifecycleEmails({
        businessId,
        enabled: preferences.lifecycleEmails,
      }),
    );
  }
  if (preferences.weeklyDigest !== Boolean(current.weeklyDigestEnabled)) {
    results.push(
      await configureWeeklyDigest({
        businessId,
        enabled: preferences.weeklyDigest,
      }),
    );
  }
  return results.every((result) => result === "updated")
    ? "updated"
    : "unavailable";
}
