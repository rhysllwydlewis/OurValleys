"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import {
  removeCategorySection,
  removeBusinessEvent,
  removeBusinessMenuDocument,
  removeBusinessOffer,
  removeMenuEntry,
  saveBusinessEvent,
  saveBusinessMenuDocument,
  saveBusinessOffer,
  saveCategorySection,
  saveMenuGroup,
  saveMenuItem,
} from "@/modules/businesses/content-features";
import {
  deleteBusinessEnquiry,
  enquiryStatuses,
  removeBusinessContactMethod,
  replyToBusinessEnquiry,
  saveBusinessContactMethod,
  updateBusinessEnquiryStatus,
  type EnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";
import {
  acceptBusinessTerms,
  changeBusinessLifecycle,
  configureAutomaticPublication,
  configureLifecycleEmails,
  confirmBusinessTrading,
  postponeAutomaticPublication,
} from "@/modules/businesses/lifecycle-automation";
import {
  businessPermissions,
  canUserAccessBusiness,
  getUserBusinessRole,
  type BusinessPermission,
} from "@/modules/businesses/permissions";
import {
  removeReviewResponse,
  respondToReview,
} from "@/modules/businesses/reviews";
import {
  businessInvitationRoles,
  changeBusinessMemberRole,
  inviteBusinessMember,
  removeBusinessMember,
  revokeBusinessInvitation,
} from "@/modules/businesses/team";
import { recordAdminAudit } from "@/modules/identity/audit-log";

async function authorisedActor(
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

function returnTo(businessId: string, outcome: string): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  redirect(`/dashboard/business/${businessId}/operations?outcome=${outcome}`);
}

function returnToInbox(
  businessId: string,
  outcome: string,
  formData: FormData,
): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  const params = new URLSearchParams({ outcome });
  const enquiryStatus = String(formData.get("enquiryStatus") ?? "");
  const enquiryPage = String(formData.get("enquiryPage") ?? "");
  if (enquiryStatus) params.set("enquiryStatus", enquiryStatus);
  if (enquiryPage) params.set("enquiryPage", enquiryPage);
  redirect(
    `/dashboard/business/${businessId}/operations?${params.toString()}#inbox`,
  );
}

function optionalId(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "");
  return z.uuid().safeParse(text).success ? text : undefined;
}

function bool(formData: FormData, name: string): boolean {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function number(formData: FormData, name: string): number {
  return Number(formData.get(name) ?? 0);
}

function dateTime(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function saveContactAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContacts,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");

  const result = await saveBusinessContactMethod({
    businessId,
    method: {
      id: optionalId(formData.get("methodId")),
      type: String(formData.get("type") ?? ""),
      label: String(formData.get("label") ?? ""),
      value: String(formData.get("value") ?? ""),
      enabled: bool(formData, "enabled"),
      isPrimary: bool(formData, "isPrimary"),
      sortOrder: number(formData, "sortOrder"),
      consentNote: String(formData.get("consentNote") ?? "") || null,
    } as never,
  });
  if (result.status === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.contact_saved",
      targetType: "business_contact_method",
      targetId: result.id,
      metadata: { businessId },
    });
  }
  returnTo(
    businessId,
    result.status === "saved" ? "contact-saved" : result.status,
  );
}

export async function removeContactAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContacts,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const methodId = String(formData.get("methodId") ?? "");
  if (!z.uuid().safeParse(methodId).success) returnTo(businessId, "invalid");
  const result = await removeBusinessContactMethod({ businessId, methodId });
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.contact_removed",
      targetType: "business_contact_method",
      targetId: methodId,
      metadata: { businessId },
    });
  }
  returnTo(businessId, result);
}

export async function updateEnquiryAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageEnquiries,
  );
  if (!actorUserId) returnToInbox(businessId, "forbidden", formData);
  const enquiryId = String(formData.get("enquiryId") ?? "");
  const status = String(formData.get("status") ?? "") as EnquiryStatus;
  if (
    !z.uuid().safeParse(enquiryId).success ||
    !(enquiryStatuses as readonly string[]).includes(status)
  ) {
    returnToInbox(businessId, "invalid", formData);
  }
  const result = await updateBusinessEnquiryStatus({
    businessId,
    enquiryId,
    status,
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
  returnToInbox(businessId, result, formData);
}

export async function replyToEnquiryAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageEnquiries,
  );
  if (!actorUserId) returnToInbox(businessId, "forbidden", formData);
  const enquiryId = String(formData.get("enquiryId") ?? "");
  const body = String(formData.get("body") ?? "");
  if (!z.uuid().safeParse(enquiryId).success) {
    returnToInbox(businessId, "invalid", formData);
  }
  const result = await replyToBusinessEnquiry({ businessId, enquiryId, body });
  if (result === "sent") {
    // Deliberately excludes the reply text: it may contain personal or
    // commercially sensitive content, and the audit log has no retention
    // link to the enquiry it was sent about (see contacts-and-enquiries.ts).
    await recordAdminAudit({
      actorUserId,
      action: "business.enquiry_replied",
      targetType: "business_enquiry",
      targetId: enquiryId,
      metadata: { businessId },
    });
  }
  returnToInbox(
    businessId,
    result === "sent" ? "enquiry-replied" : result,
    formData,
  );
}

export async function deleteEnquiryAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageEnquiries,
  );
  if (!actorUserId) returnToInbox(businessId, "forbidden", formData);
  const enquiryId = String(formData.get("enquiryId") ?? "");
  if (!z.uuid().safeParse(enquiryId).success)
    returnToInbox(businessId, "invalid", formData);
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
  returnToInbox(
    businessId,
    result === "deleted" ? "enquiry-deleted" : result,
    formData,
  );
}

export async function saveOfferAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const result = await saveBusinessOffer({
    businessId,
    offer: {
      id: optionalId(formData.get("offerId")),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      terms: String(formData.get("terms") ?? "") || null,
      actionLabel: String(formData.get("actionLabel") ?? "") || null,
      actionUrl: String(formData.get("actionUrl") ?? "") || null,
      startsAt: dateTime(formData.get("startsAt")),
      endsAt: dateTime(formData.get("endsAt")),
      status: String(formData.get("status") ?? "draft"),
      sortOrder: number(formData, "sortOrder"),
    } as never,
  });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.offer_saved",
      targetType: "business",
      targetId: businessId,
    });
  }
  returnTo(businessId, result === "saved" ? "offer-saved" : result);
}

export async function removeOfferAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const offerId = String(formData.get("offerId") ?? "");
  if (!z.uuid().safeParse(offerId).success) returnTo(businessId, "invalid");
  const result = await removeBusinessOffer(businessId, offerId);
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.offer_removed",
      targetType: "business_offer",
      targetId: offerId,
      metadata: { businessId },
    });
  }
  returnTo(businessId, result);
}

export async function saveEventAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const startsAt = dateTime(formData.get("startsAt"));
  if (!startsAt) returnTo(businessId, "invalid");
  const result = await saveBusinessEvent({
    businessId,
    event: {
      id: optionalId(formData.get("eventId")),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      locationDisplay: String(formData.get("locationDisplay") ?? "") || null,
      startsAt,
      endsAt: dateTime(formData.get("endsAt")),
      bookingUrl: String(formData.get("bookingUrl") ?? "") || null,
      status: String(formData.get("status") ?? "draft"),
    } as never,
  });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.event_saved",
      targetType: "business",
      targetId: businessId,
    });
  }
  returnTo(businessId, result === "saved" ? "event-saved" : result);
}

export async function removeEventAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const eventId = String(formData.get("eventId") ?? "");
  if (!z.uuid().safeParse(eventId).success) returnTo(businessId, "invalid");
  const result = await removeBusinessEvent(businessId, eventId);
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.event_removed",
      targetType: "business_event",
      targetId: eventId,
      metadata: { businessId },
    });
  }
  returnTo(businessId, result);
}

export async function saveMenuGroupAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const result = await saveMenuGroup({
    businessId,
    group: {
      id: optionalId(formData.get("groupId")),
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      sortOrder: number(formData, "sortOrder"),
      status: String(formData.get("status") ?? "active"),
    } as never,
  });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.menu_saved",
      targetType: "business",
      targetId: businessId,
      metadata: { entry: "group" },
    });
  }
  returnTo(businessId, result === "saved" ? "menu-saved" : result);
}

export async function saveMenuItemAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const result = await saveMenuItem({
    businessId,
    item: {
      id: optionalId(formData.get("itemId")),
      groupId: String(formData.get("groupId") ?? ""),
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      priceDisplay: String(formData.get("priceDisplay") ?? "") || null,
      dietaryLabels: String(formData.get("dietaryLabels") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      available: bool(formData, "available"),
      featured: bool(formData, "featured"),
      sortOrder: number(formData, "sortOrder"),
    } as never,
  });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.menu_saved",
      targetType: "business",
      targetId: businessId,
      metadata: { entry: "item" },
    });
  }
  returnTo(businessId, result === "saved" ? "menu-saved" : result);
}

export async function removeMenuAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const result = await removeMenuEntry({
    businessId,
    groupId: optionalId(formData.get("groupId")),
    itemId: optionalId(formData.get("itemId")),
  });
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.menu_removed",
      targetType: "business",
      targetId: businessId,
    });
  }
  returnTo(businessId, result);
}

export async function saveCategorySectionAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const entries = String(formData.get("entries") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, description = "", meta] = line
        .split("|")
        .map((part) => part.trim());
      return { title, description, meta: meta || undefined };
    });
  const result = await saveCategorySection({
    businessId,
    section: {
      id: optionalId(formData.get("sectionId")),
      sectionType: String(formData.get("sectionType") ?? ""),
      title: String(formData.get("title") ?? ""),
      entries,
      status: String(formData.get("status") ?? "active"),
      sortOrder: number(formData, "sortOrder"),
    } as never,
  });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.category_section_saved",
      targetType: "business",
      targetId: businessId,
    });
  }
  returnTo(businessId, result === "saved" ? "section-saved" : result);
}

export async function removeCategorySectionAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const sectionId = String(formData.get("sectionId") ?? "");
  if (!z.uuid().safeParse(sectionId).success) returnTo(businessId, "invalid");
  const result = await removeCategorySection(businessId, sectionId);
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.category_section_removed",
      targetType: "business_category_section",
      targetId: sectionId,
      metadata: { businessId },
    });
  }
  returnTo(businessId, result);
}

export async function uploadMenuDocumentAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    returnTo(businessId, "invalid");
  const result = await saveBusinessMenuDocument({
    businessId,
    displayName: file.name,
    contentType: file.type,
    bytes: Buffer.from(await file.arrayBuffer()),
  });
  returnTo(businessId, result === "saved" ? "document-saved" : result);
}

export async function removeMenuDocumentAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  returnTo(businessId, await removeBusinessMenuDocument(businessId));
}

export async function acceptTermsAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.publish,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  if (!bool(formData, "acceptTerms")) returnTo(businessId, "invalid");
  returnTo(
    businessId,
    (await acceptBusinessTerms({ businessId, userId: actorUserId })) ===
      "accepted"
      ? "terms-accepted"
      : "unavailable",
  );
}

export async function configureAutoPublishAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.publish,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const result = await configureAutomaticPublication({
    businessId,
    enabled: bool(formData, "enabled"),
  });
  returnTo(businessId, result === "updated" ? "auto-publish-updated" : result);
}

export async function configureLifecycleEmailsAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.publish,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const result = await configureLifecycleEmails({
    businessId,
    enabled: bool(formData, "enabled"),
  });
  returnTo(
    businessId,
    result === "updated" ? "lifecycle-emails-updated" : result,
  );
}

export async function postponeAutoPublishAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.publish,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const until = dateTime(formData.get("until"));
  if (!until) returnTo(businessId, "invalid");
  returnTo(
    businessId,
    await postponeAutomaticPublication({ businessId, until: new Date(until) }),
  );
}

export async function confirmTradingAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageLifecycle,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const result = await confirmBusinessTrading({ businessId, actorUserId });
  returnTo(businessId, result);
}

export async function lifecycleAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageLifecycle,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const action = String(formData.get("action") ?? "");
  if (
    ![
      "pause",
      "resume",
      "temporary_close",
      "permanent_close",
      "request_deletion",
      "cancel_deletion",
    ].includes(action)
  ) {
    returnTo(businessId, "invalid");
  }
  const ownerOnlyActions = [
    "permanent_close",
    "request_deletion",
    "cancel_deletion",
  ];
  if (
    ownerOnlyActions.includes(action) &&
    (await getUserBusinessRole({ userId: actorUserId, businessId })) !== "owner"
  ) {
    returnTo(businessId, "forbidden");
  }
  const temporaryClosedUntil = dateTime(formData.get("temporaryClosedUntil"));
  const result = await changeBusinessLifecycle({
    businessId,
    actorUserId,
    action: action as never,
    temporaryClosedUntil: temporaryClosedUntil
      ? new Date(temporaryClosedUntil)
      : null,
  });
  returnTo(businessId, result);
}

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageMembers,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!(businessInvitationRoles as readonly string[]).includes(role)) {
    returnTo(businessId, "invalid");
  }
  const result = await inviteBusinessMember({
    businessId,
    email,
    role: role as never,
    invitedByUserId: actorUserId,
  });
  if (result.status === "invited") {
    await recordAdminAudit({
      actorUserId,
      action: "membership.invited",
      targetType: "business",
      targetId: businessId,
      metadata: { email, role },
    });
  }
  returnTo(
    businessId,
    result.status === "invited" ? "invitation-sent" : result.status,
  );
}

export async function revokeInvitationAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageMembers,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const invitationId = String(formData.get("invitationId") ?? "");
  if (!z.uuid().safeParse(invitationId).success)
    returnTo(businessId, "invalid");
  const result = await revokeBusinessInvitation({ businessId, invitationId });
  if (result === "revoked") {
    await recordAdminAudit({
      actorUserId,
      action: "membership.invitation_revoked",
      targetType: "business_invitation",
      targetId: invitationId,
      metadata: { businessId },
    });
  }
  returnTo(businessId, result === "revoked" ? "invitation-revoked" : result);
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageMembers,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const membershipId = String(formData.get("membershipId") ?? "");
  if (!z.uuid().safeParse(membershipId).success)
    returnTo(businessId, "invalid");
  const result = await removeBusinessMember({ businessId, membershipId });
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "membership.removed",
      targetType: "business_membership",
      targetId: membershipId,
      metadata: { businessId },
    });
  }
  returnTo(businessId, result === "removed" ? "member-removed" : result);
}

export async function changeMemberRoleAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageMembers,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const membershipId = String(formData.get("membershipId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!z.uuid().safeParse(membershipId).success)
    returnTo(businessId, "invalid");
  const result = await changeBusinessMemberRole({
    businessId,
    membershipId,
    role,
  });
  if (result === "updated") {
    await recordAdminAudit({
      actorUserId,
      action: "membership.role_changed",
      targetType: "business_membership",
      targetId: membershipId,
      metadata: { businessId, role },
    });
  }
  returnTo(businessId, result === "updated" ? "role-updated" : result);
}

export async function respondToReviewAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const reviewId = String(formData.get("reviewId") ?? "");
  if (!z.uuid().safeParse(reviewId).success) returnTo(businessId, "invalid");
  const result = await respondToReview({
    reviewId,
    businessId,
    responderUserId: actorUserId,
    body: String(formData.get("body") ?? ""),
  });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "review.responded",
      targetType: "business_review",
      targetId: reviewId,
      metadata: { businessId },
    });
  }
  returnTo(businessId, result === "saved" ? "review-response-saved" : result);
}

export async function removeReviewResponseAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const reviewId = String(formData.get("reviewId") ?? "");
  if (!z.uuid().safeParse(reviewId).success) returnTo(businessId, "invalid");
  const result = await removeReviewResponse({ reviewId, businessId });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "review.response_removed",
      targetType: "business_review",
      targetId: reviewId,
      metadata: { businessId },
    });
  }
  returnTo(businessId, result === "saved" ? "review-response-removed" : result);
}
