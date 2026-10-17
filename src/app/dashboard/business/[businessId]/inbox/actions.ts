"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import {
  deleteBusinessEnquiry,
  replyToBusinessEnquiry,
  updateBusinessEnquiryStatus,
  type EnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";
import {
  bulkSetEnquiryStatus,
  markEnquiryRead,
} from "@/modules/businesses/inbox";
import {
  buildInboxHref,
  isBulkStatus,
  parseInboxQuery,
  parseSelectedIds,
  type InboxQuery,
} from "@/modules/businesses/inbox-model";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { recordAdminAudit } from "@/modules/identity/audit-log";

async function authorisedActor(businessId: string): Promise<string | null> {
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
      permission: businessPermissions.manageEnquiries,
    });
    return allowed ? session.user.id : null;
  } catch {
    return null;
  }
}

/** The list the owner was looking at, rebuilt from validated fields only. */
function queryFromForm(formData: FormData): InboxQuery {
  const field = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };
  return parseInboxQuery({
    box: field("box"),
    kind: field("kind"),
    q: field("q"),
    page: field("page"),
    enquiry: field("enquiry"),
  });
}

function finish(
  businessId: string,
  query: InboxQuery,
  outcome: string,
  count?: number,
): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  const base = buildInboxHref(businessId, query);
  const url = new URL(base, "http://placeholder.invalid");
  url.searchParams.set("outcome", outcome);
  if (count !== undefined) url.searchParams.set("n", String(count));
  redirect(`${url.pathname}${url.search}` as Route);
}

/**
 * Called from the reading pane when an enquiry is opened. A POST, so link
 * prefetching can never mark anything read.
 */
export async function markEnquiryReadAction(
  businessId: string,
  enquiryId: string,
): Promise<"updated" | "unchanged" | "forbidden" | "invalid"> {
  if (!z.uuid().safeParse(enquiryId).success) return "invalid";
  const actorUserId = await authorisedActor(businessId);
  if (!actorUserId) return "forbidden";
  const result = await markEnquiryRead(businessId, enquiryId);
  if (result === "updated") {
    revalidatePath(`/dashboard/business/${businessId}`, "layout");
    return "updated";
  }
  return "unchanged";
}

export async function setEnquiryStatusAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const query = queryFromForm(formData);
  const actorUserId = await authorisedActor(businessId);
  if (!actorUserId) finish(businessId, query, "forbidden");
  const enquiryId = String(formData.get("enquiryId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    !z.uuid().safeParse(enquiryId).success ||
    !(
      ["new", "read", "closed", "archived", "spam"] as readonly string[]
    ).includes(status)
  ) {
    finish(businessId, query, "invalid");
  }
  const result = await updateBusinessEnquiryStatus({
    businessId,
    enquiryId,
    status: status as EnquiryStatus,
  });
  if (result === "updated") {
    await recordAdminAudit({
      actorUserId,
      action: "business.enquiry_status_changed",
      targetType: "business_enquiry",
      targetId: enquiryId,
      metadata: { businessId, status },
    });
  }
  // Handled enquiries leave the open list, so drop the selection for those.
  const stayOpen = status === "new" || status === "read";
  finish(
    businessId,
    { ...query, enquiryId: stayOpen ? query.enquiryId : null },
    result === "updated" ? `status-${status}` : result,
  );
}

export async function bulkEnquiryStatusAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const query = { ...queryFromForm(formData), enquiryId: null };
  const actorUserId = await authorisedActor(businessId);
  if (!actorUserId) finish(businessId, query, "forbidden");
  const status = String(formData.get("status") ?? "");
  const ids = parseSelectedIds(formData.getAll("ids"));
  if (!isBulkStatus(status)) finish(businessId, query, "invalid");
  if (ids.length === 0) finish(businessId, query, "nothing-selected");
  const result = await bulkSetEnquiryStatus({
    businessId,
    enquiryIds: ids,
    status,
  });
  if (result.status !== "updated") finish(businessId, query, result.status);
  if (result.updated > 0) {
    await recordAdminAudit({
      actorUserId,
      action: "business.enquiries_bulk_status_changed",
      targetType: "business",
      targetId: businessId,
      metadata: { businessId, status, count: result.updated },
    });
  }
  finish(businessId, query, `bulk-${status}`, result.updated);
}

export async function replyToEnquiryFromInboxAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const query = queryFromForm(formData);
  const actorUserId = await authorisedActor(businessId);
  if (!actorUserId) finish(businessId, query, "forbidden");
  const enquiryId = String(formData.get("enquiryId") ?? "");
  if (!z.uuid().safeParse(enquiryId).success) {
    finish(businessId, query, "invalid");
  }
  const result = await replyToBusinessEnquiry({
    businessId,
    enquiryId,
    body: String(formData.get("body") ?? ""),
  });
  if (result === "sent") {
    // The reply text is never recorded: it may hold personal or commercially
    // sensitive content with no retention link to the enquiry.
    await recordAdminAudit({
      actorUserId,
      action: "business.enquiry_replied",
      targetType: "business_enquiry",
      targetId: enquiryId,
      metadata: { businessId },
    });
  }
  finish(
    businessId,
    { ...query, enquiryId },
    result === "sent" ? "replied" : result,
  );
}

export async function deleteEnquiryFromInboxAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const query = { ...queryFromForm(formData), enquiryId: null };
  const actorUserId = await authorisedActor(businessId);
  if (!actorUserId) finish(businessId, query, "forbidden");
  const enquiryId = String(formData.get("enquiryId") ?? "");
  if (!z.uuid().safeParse(enquiryId).success) {
    finish(businessId, query, "invalid");
  }
  const result = await deleteBusinessEnquiry({ businessId, enquiryId });
  if (result === "deleted") {
    await recordAdminAudit({
      actorUserId,
      action: "business.enquiry_deleted",
      targetType: "business_enquiry",
      targetId: enquiryId,
      metadata: { businessId },
    });
  }
  finish(businessId, query, result === "deleted" ? "deleted" : result);
}
