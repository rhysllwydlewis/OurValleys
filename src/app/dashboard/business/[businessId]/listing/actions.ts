"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import {
  acceptBusinessTerms,
  postponeAutomaticPublication,
} from "@/modules/businesses/lifecycle-automation";
import {
  applyListingAction,
  saveReminderPreferences,
} from "@/modules/businesses/listing-health";
import {
  isListingAction,
  parseClosureDate,
} from "@/modules/businesses/listing-health-model";
import {
  businessPermissions,
  canUserAccessBusiness,
  type BusinessPermission,
} from "@/modules/businesses/permissions";

/** The signed-in member holding `permission` on this business, or null. */
async function actorWith(
  businessId: string,
  permission: BusinessPermission,
): Promise<string | null> {
  if (!z.uuid().safeParse(businessId).success) return null;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) return null;
    if (!canUseBusinessOperationsTools(session.user.email)) return null;
    const allowed = await canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission,
    });
    return allowed ? session.user.id : null;
  } catch {
    return null;
  }
}

function backTo(businessId: string, outcome: string): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  redirect(
    `/dashboard/business/${businessId}/listing?${new URLSearchParams({ outcome })}`,
  );
}

/**
 * Confirm, pause, resume, close for a while, close for good, or ask for
 * deletion. Needs the lifecycle permission; closing for good and deletion are
 * owner-only and need the business name typed back (checked again in the
 * service so this form is not the only guard).
 */
export async function listingAction(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await actorWith(
    businessId,
    businessPermissions.manageLifecycle,
  );
  if (!actorUserId) backTo(businessId, "forbidden");

  const action = formData.get("action");
  if (!isListingAction(action)) backTo(businessId, "invalid");

  const outcome = await applyListingAction({
    businessId,
    actorUserId,
    action,
    closureDate: String(formData.get("closureDate") ?? ""),
    confirmName: String(formData.get("confirmName") ?? ""),
  });
  backTo(businessId, outcome);
}

/** The three reminder switches. Needs the publish permission, like the older form. */
export async function reminderPreferencesAction(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await actorWith(businessId, businessPermissions.publish);
  if (!actorUserId) backTo(businessId, "forbidden");

  const on = (name: string) => formData.get(name) === "on";
  const result = await saveReminderPreferences({
    businessId,
    preferences: {
      autoPublish: on("autoPublish"),
      lifecycleEmails: on("lifecycleEmails"),
      weeklyDigest: on("weeklyDigest"),
    },
  });
  backTo(
    businessId,
    result === "updated" ? "preferences_saved" : "unavailable",
  );
}

/** Accept the current terms, which automatic publication requires. */
export async function acceptListingTermsAction(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await actorWith(businessId, businessPermissions.publish);
  if (!actorUserId) backTo(businessId, "forbidden");
  if (formData.get("acceptTerms") !== "on") backTo(businessId, "invalid");
  const result = await acceptBusinessTerms({
    businessId,
    userId: actorUserId,
  });
  backTo(businessId, result === "accepted" ? "terms_accepted" : "unavailable");
}

/** Push a scheduled automatic publication back (at most 90 days, as the service enforces). */
export async function postponeListingAction(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await actorWith(businessId, businessPermissions.publish);
  if (!actorUserId) backTo(businessId, "forbidden");
  const parsed = parseClosureDate(
    String(formData.get("postponeDate") ?? ""),
    new Date(),
  );
  if (!parsed.ok) backTo(businessId, `date_${parsed.reason}`);
  const result = await postponeAutomaticPublication({
    businessId,
    until: parsed.until,
  });
  backTo(businessId, result === "updated" ? "postponed" : result);
}
