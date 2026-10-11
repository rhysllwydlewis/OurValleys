"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { areReviewsEnabled } from "@/lib/reviews-flag";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import { normaliseOfferAction } from "@/modules/businesses/offer-form";
import {
  currentContentImageId,
  updateContentImageAlt,
  releaseContentImageIfUnused,
  saveContentImage,
  type ContentImageKind,
} from "@/modules/businesses/content-images";
import {
  cancelUpcomingSeriesEvents,
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
  removeSpecialDay,
  saveSpecialDay,
  saveWeeklyOpeningHours,
} from "@/modules/businesses/opening-hours";
import {
  parseSpecialDayForm,
  parseWeeklyHoursForm,
  validateSpecialDay,
  validateWeeklyHours,
  weekdayOrder,
  type HoursFormState,
} from "@/modules/businesses/opening-hours-form";
import { londonDateString } from "@/modules/businesses/opening-hours-exceptions";
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
  requestBusinessSlugChange,
  withdrawBusinessSlugChange,
} from "@/modules/businesses/tickets";
import {
  businessInvitationRoles,
  changeBusinessMemberRole,
  inviteBusinessMember,
  removeBusinessMember,
  revokeBusinessInvitation,
  transferBusinessOwnership,
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

function returnToHours(businessId: string, outcome: string): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  redirect(
    `/dashboard/business/${businessId}/operations?outcome=${outcome}#hours`,
  );
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

/** Repeat settings apply to new events only; editing never regenerates rows. */
function repeatInput(formData: FormData) {
  if (optionalId(formData.get("eventId"))) return undefined;
  const frequency = String(formData.get("repeatFrequency") ?? "");
  if (!frequency || frequency === "never") return undefined;
  return {
    frequency,
    occurrences: Number(formData.get("repeatOccurrences") ?? 0),
  };
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

type ContentImageChange =
  | {
      ok: true;
      /** `undefined` leaves the picture alone, `null` removes it. */
      imageMediaId: string | null | undefined;
      /** Set when this request uploaded a picture that may need cleaning up. */
      uploadedMediaId: string | null;
    }
  | { ok: false; outcome: string };

/**
 * Reads the optional picture fields of an offer or event form. A newly chosen
 * file wins over "remove the picture"; no file and no tick leaves it as it is.
 */
async function readContentImageChange(
  formData: FormData,
  businessId: string,
  kind: ContentImageKind,
  itemId: string | undefined,
): Promise<ContentImageChange> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const saved = await saveContentImage({
      businessId,
      kind,
      contentType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
      altText: String(formData.get("imageAlt") ?? ""),
      // Read on the server for this business, never taken from the form.
      replacingMediaId: itemId
        ? await currentContentImageId({ businessId, kind, itemId })
        : null,
    });
    if (saved.status === "saved") {
      return {
        ok: true,
        imageMediaId: saved.mediaId,
        uploadedMediaId: saved.mediaId,
      };
    }
    const outcomes = {
      invalid: "image-invalid",
      limit: "image-limit",
      disabled: "image-storage",
      unavailable: "unavailable",
    } as const;
    return { ok: false, outcome: outcomes[saved.status] };
  }
  if (bool(formData, "removeImage")) {
    return { ok: true, imageMediaId: null, uploadedMediaId: null };
  }
  // No new file: a typed description edits the current picture's description.
  const newAlt = String(formData.get("imageAlt") ?? "").trim();
  if (newAlt && itemId) {
    const updated = await updateContentImageAlt({
      businessId,
      kind,
      itemId,
      altText: newAlt,
    });
    if (updated === "invalid") return { ok: false, outcome: "image-invalid" };
    if (updated === "unavailable") return { ok: false, outcome: "unavailable" };
  }
  return { ok: true, imageMediaId: undefined, uploadedMediaId: null };
}

export async function saveOfferAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const image = await readContentImageChange(
    formData,
    businessId,
    "offer",
    optionalId(formData.get("offerId")),
  );
  if (!image.ok) returnTo(businessId, image.outcome);
  const result = await saveBusinessOffer({
    businessId,
    imageMediaId: image.imageMediaId,
    offer: {
      id: optionalId(formData.get("offerId")),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      terms: String(formData.get("terms") ?? "") || null,
      ...normaliseOfferAction({
        label: String(formData.get("actionLabel") ?? ""),
        url: String(formData.get("actionUrl") ?? ""),
      }),
      startsAt: dateTime(formData.get("startsAt")),
      endsAt: dateTime(formData.get("endsAt")),
      status: String(formData.get("status") ?? "draft"),
      sortOrder: number(formData, "sortOrder"),
    } as never,
  });
  if (result !== "saved") {
    // The upload happened first; do not leave it behind when the save failed.
    await releaseContentImageIfUnused({
      businessId,
      mediaId: image.uploadedMediaId,
    });
  }
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

function formReader(formData: FormData) {
  return (name: string) => String(formData.get(name) ?? "");
}

/** The submitted fields, so a refused form can show exactly what was typed. */
function submittedValues(formData: FormData, names: string[]) {
  const values: Record<string, string> = {};
  for (const name of names) {
    const value = formData.get(name);
    if (typeof value === "string") values[name] = value;
  }
  return values;
}

function refusal(
  previous: HoursFormState,
  validation: { summary: string; fieldErrors: Record<string, string> },
  values: Record<string, string>,
): HoursFormState {
  return {
    status: "error",
    summary: validation.summary,
    fieldErrors: validation.fieldErrors,
    values,
    attempt: previous.attempt + 1,
  };
}

/**
 * Form actions for `useActionState`: a refused submission returns field-level
 * errors and the values typed, so nothing the owner entered is lost; success
 * and non-field outcomes redirect back to the section as before.
 */
export async function saveOpeningHoursAction(
  previous: HoursFormState,
  formData: FormData,
): Promise<HoursFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.editProfile,
  );
  if (!actorUserId) returnToHours(businessId, "forbidden");
  const hours = parseWeeklyHoursForm(formReader(formData));
  const validation = validateWeeklyHours(hours);
  if (!validation.ok) {
    return refusal(
      previous,
      validation,
      submittedValues(
        formData,
        weekdayOrder.flatMap((day) => [
          `closed-${day}`,
          `opens-${day}`,
          `closes-${day}`,
        ]),
      ),
    );
  }
  const result = await saveWeeklyOpeningHours({ businessId, hours });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.opening_hours_saved",
      targetType: "business",
      targetId: businessId,
    });
  }
  returnToHours(businessId, result === "saved" ? "hours-saved" : result);
}

export async function saveSpecialDayAction(
  previous: HoursFormState,
  formData: FormData,
): Promise<HoursFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.editProfile,
  );
  if (!actorUserId) returnToHours(businessId, "forbidden");
  const specialDay = parseSpecialDayForm(formReader(formData));
  const validation = validateSpecialDay(
    specialDay,
    londonDateString(new Date()),
  );
  if (!validation.ok) {
    return refusal(
      previous,
      validation,
      submittedValues(formData, ["date", "closed", "opens", "closes", "note"]),
    );
  }
  const result = await saveSpecialDay({ businessId, specialDay });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.special_day_saved",
      targetType: "business",
      targetId: businessId,
      metadata: { date: specialDay.date, closed: specialDay.closed },
    });
  }
  returnToHours(businessId, result === "saved" ? "special-day-saved" : result);
}

/**
 * One-click bank-holiday suggestions post here: a plain form action whose
 * values come from a fixed button, so there is no form state to keep.
 */
export async function saveBankHolidayAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.editProfile,
  );
  if (!actorUserId) returnToHours(businessId, "forbidden");
  const specialDay = parseSpecialDayForm(formReader(formData));
  const result = await saveSpecialDay({ businessId, specialDay });
  if (result === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.special_day_saved",
      targetType: "business",
      targetId: businessId,
      metadata: { date: specialDay.date, closed: specialDay.closed },
    });
  }
  returnToHours(businessId, result === "saved" ? "special-day-saved" : result);
}

export async function removeSpecialDayAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.editProfile,
  );
  if (!actorUserId) returnToHours(businessId, "forbidden");
  const date = String(formData.get("date") ?? "");
  const result = await removeSpecialDay({ businessId, date });
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.special_day_removed",
      targetType: "business",
      targetId: businessId,
      metadata: { date },
    });
  }
  returnToHours(
    businessId,
    result === "removed" ? "special-day-removed" : result,
  );
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
  const image = await readContentImageChange(
    formData,
    businessId,
    "event",
    optionalId(formData.get("eventId")),
  );
  if (!image.ok) returnTo(businessId, image.outcome);
  const result = await saveBusinessEvent({
    businessId,
    imageMediaId: image.imageMediaId,
    event: {
      id: optionalId(formData.get("eventId")),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      locationDisplay: String(formData.get("locationDisplay") ?? "") || null,
      startsAt,
      endsAt: dateTime(formData.get("endsAt")),
      bookingUrl: String(formData.get("bookingUrl") ?? "") || null,
      status: String(formData.get("status") ?? "draft"),
      repeat: repeatInput(formData),
    } as never,
  });
  if (result !== "saved") {
    await releaseContentImageIfUnused({
      businessId,
      mediaId: image.uploadedMediaId,
    });
  }
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

export async function cancelEventSeriesAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const eventId = String(formData.get("eventId") ?? "");
  if (!z.uuid().safeParse(eventId).success) returnTo(businessId, "invalid");
  const result = await cancelUpcomingSeriesEvents(businessId, eventId);
  if (result.outcome === "cancelled") {
    await recordAdminAudit({
      actorUserId,
      action: "business.event_series_cancelled",
      targetType: "business_event",
      targetId: eventId,
      metadata: { businessId, count: result.count },
    });
    returnTo(businessId, "series-cancelled");
  }
  returnTo(businessId, result.outcome);
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

const slugChangeOutcomes = {
  requested: "slug-requested",
  invalid: "slug-invalid",
  same: "slug-same",
  taken: "slug-taken",
  pending: "slug-pending",
  not_found: "not_found",
  unavailable: "unavailable",
} as const;

export async function requestSlugChangeAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageLifecycle,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const result = await requestBusinessSlugChange({
    businessId,
    userId: actorUserId,
    proposedName: String(formData.get("proposedName") ?? "").slice(0, 120),
    reason: String(formData.get("reason") ?? "").slice(0, 500),
  });
  returnTo(businessId, slugChangeOutcomes[result.status]);
}

export async function withdrawSlugChangeAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageLifecycle,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const result = await withdrawBusinessSlugChange({
    businessId,
    userId: actorUserId,
  });
  returnTo(
    businessId,
    result.status === "withdrawn"
      ? "slug-withdrawn"
      : result.status === "none"
        ? "slug-none"
        : "unavailable",
  );
}

const ownershipFailures = {
  not_owner: "forbidden",
  not_found: "member-missing",
  already_owner: "already_owner",
  self: "ownership-self",
  unverified: "ownership-unverified",
  confirmation_mismatch: "ownership-confirm",
  unavailable: "unavailable",
} as const;

export async function transferOwnershipAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageMembers,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  const targetMembershipId = String(formData.get("membershipId") ?? "");
  if (!z.uuid().safeParse(targetMembershipId).success)
    returnTo(businessId, "invalid");
  // The more destructive "transfer" is never a default for a missing or
  // unrecognised value.
  const submittedMode = formData.get("mode");
  if (submittedMode !== "transfer" && submittedMode !== "share")
    returnTo(businessId, "invalid");
  const result = await transferBusinessOwnership({
    businessId,
    actorUserId,
    targetMembershipId,
    mode: submittedMode,
    confirmName: String(formData.get("confirmName") ?? "").slice(0, 200),
  });
  if (result.status === "transferred" || result.status === "shared") {
    returnTo(
      businessId,
      result.noticesFailed > 0
        ? "ownership-notices"
        : result.status === "transferred"
          ? "ownership-transferred"
          : "ownership-shared",
    );
  }
  returnTo(businessId, ownershipFailures[result.status]);
}

export async function respondToReviewAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await authorisedActor(
    businessId,
    businessPermissions.manageContent,
  );
  if (!actorUserId) returnTo(businessId, "forbidden");
  if (!areReviewsEnabled()) returnTo(businessId, "unavailable");
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
  if (!areReviewsEnabled()) returnTo(businessId, "unavailable");
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
