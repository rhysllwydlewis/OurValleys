"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import { resolveOwnerCorrection } from "@/modules/businesses/corrections";
import { isOwnerCorrectionDecision } from "@/modules/businesses/corrections-model";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";

/** The signed-in member allowed to edit this business's profile, or null. */
async function profileActor(businessId: string): Promise<string | null> {
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
      permission: businessPermissions.editProfile,
    });
    return allowed ? session.user.id : null;
  } catch {
    return null;
  }
}

function backTo(businessId: string, outcome: string): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  redirect(
    `/dashboard/business/${businessId}/corrections?${new URLSearchParams({ outcome })}`,
  );
}

/**
 * The owner's decision on one visitor suggestion: apply it, mark it handled,
 * decline it or hand it to an admin. Requires the profile permission, and the
 * ticket must belong to this business (checked again in the transaction).
 */
export async function decideCorrectionAction(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await profileActor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");

  const ticketId = String(formData.get("ticketId") ?? "");
  const decision = formData.get("decision");
  if (
    !z.uuid().safeParse(ticketId).success ||
    !isOwnerCorrectionDecision(decision)
  ) {
    backTo(businessId, "invalid");
  }

  const result = await resolveOwnerCorrection({
    businessId,
    ticketId,
    actorUserId,
    decision,
    note: String(formData.get("note") ?? ""),
  });
  switch (result.status) {
    case "invalid":
      backTo(businessId, result.reason);
    case "not_found":
    case "not_open":
      backTo(businessId, "gone");
    case "unavailable":
      backTo(businessId, "unavailable");
    default:
      backTo(businessId, result.status);
  }
}
