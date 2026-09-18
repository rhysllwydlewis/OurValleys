"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { businessOperationsRoutePermissions } from "@/modules/businesses/operations-access";
import { acceptBusinessInvitation } from "@/modules/businesses/team";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

/**
 * The operations dashboard currently requires every permission in
 * businessOperationsRoutePermissions at once. A role that does not carry all
 * of them (editor, viewer) would bounce straight back off that route, so
 * such members land on the plain business dashboard instead, which only
 * requires view access.
 */
function hasFullOperationsAccess(role: string): boolean {
  const granted = new Set(permissionsForBusinessRole(role as never));
  return businessOperationsRoutePermissions.every((permission) =>
    granted.has(permission),
  );
}

export async function acceptInvitationAction(
  formData: FormData,
): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`);
  }

  const result = await acceptBusinessInvitation({
    token,
    userId: session.user.id,
    userEmail: session.user.email,
  });

  if (result.status === "accepted" || result.status === "already_member") {
    if (result.status === "accepted") {
      await recordAdminAudit({
        actorUserId: session.user.id,
        action: "membership.invitation_accepted",
        targetType: "business",
        targetId: result.businessId,
      });
    }
    const outcome = result.status === "accepted" ? "?outcome=team-joined" : "";
    redirect(
      hasFullOperationsAccess(result.role)
        ? `/dashboard/business/${result.businessId}/operations${outcome}#team`
        : `/dashboard/business/${result.businessId}`,
    );
  }

  redirect(`/invitations/${token}?outcome=${result.status}`);
}
