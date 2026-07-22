"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { createBusinessTicket } from "@/modules/businesses/tickets";

export async function submitClaimAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  if (!z.uuid().safeParse(businessId).success) redirect("/businesses");
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) redirect(`/login?next=/claim/${businessId}`);
  if (isPublicDemoEmail(session.user.email)) redirect("/businesses");
  if (!session.user.emailVerified)
    redirect(`/claim/${businessId}?outcome=verify-email`);

  const reason = String(formData.get("reason") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const evidenceNote = String(formData.get("evidenceNote") ?? "").trim();
  const result = await createBusinessTicket({
    businessId,
    reporterUserId: session.user.id,
    reporterEmail: session.user.email,
    type: "claim",
    reason,
    evidence: {
      claimedRole: role,
      website: website || null,
      phone: phone || null,
      note: evidenceNote || null,
    },
    riskLevel: "standard",
  });
  redirect(
    result.status === "created"
      ? `/claim/${businessId}?outcome=submitted`
      : `/claim/${businessId}?outcome=${result.status}`,
  );
}
