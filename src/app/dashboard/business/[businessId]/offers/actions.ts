"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import {
  applyContentImageAlt,
  readContentImageChange,
} from "@/modules/businesses/content-image-form";
import { releaseContentImageIfUnused } from "@/modules/businesses/content-images";
import { removeBusinessOffer } from "@/modules/businesses/content-features";
import {
  initialOfferFormState,
  isQuickAction,
  parseOfferForm,
  readOfferValues,
  type OfferFormError,
  type OfferFormState,
} from "@/modules/businesses/offer-studio-model";
import {
  applyOfferQuickAction,
  checkOfferCurrent,
  saveStudioOffer,
} from "@/modules/businesses/offer-studio";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { recordAdminAudit } from "@/modules/identity/audit-log";

/** The signed-in member allowed to manage this business's content, or null. */
async function contentActor(businessId: string): Promise<string | null> {
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
      permission: businessPermissions.manageContent,
    });
    return allowed ? session.user.id : null;
  } catch {
    return null;
  }
}

function backTo(businessId: string, outcome: string, offerId?: string): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  const query = new URLSearchParams({ outcome });
  const anchor =
    offerId && z.uuid().safeParse(offerId).success ? `#offer-${offerId}` : "";
  redirect(`/dashboard/business/${businessId}/offers?${query}${anchor}`);
}

function optionalId(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "");
  return z.uuid().safeParse(text).success ? text : undefined;
}

function refused(
  previous: OfferFormState,
  formData: FormData,
  change: Pick<OfferFormState, "errors" | "formError">,
): OfferFormState {
  return {
    status: "error",
    errors: change.errors,
    formError: change.formError,
    values: readOfferValues((name) => formData.get(name)),
    attempt: previous.attempt + 1,
  };
}

/**
 * Creates or edits an offer. A refused form returns field-level error codes
 * and the values typed (translated and re-shown by the client); a saved one
 * returns to the studio list.
 */
export async function saveOfferStudioAction(
  previous: OfferFormState = initialOfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) {
    return refused(previous, formData, { errors: {}, formError: "forbidden" });
  }
  const rawOfferId = String(formData.get("offerId") ?? "");
  // An edit form always carries its id; a damaged one must not become a create.
  if (rawOfferId && !z.uuid().safeParse(rawOfferId).success) {
    return refused(previous, formData, { errors: {}, formError: "invalid" });
  }
  const offerId = rawOfferId || undefined;
  const expected = Number(formData.get("expectedUpdatedAt"));
  const expectedUpdatedAt =
    offerId && Number.isFinite(expected) && expected > 0 ? expected : undefined;
  // The stale-save check cannot be skipped by omitting or damaging the stamp.
  if (offerId && expectedUpdatedAt === undefined) {
    return refused(previous, formData, { errors: {}, formError: "invalid" });
  }
  let storedStatus: string | undefined;
  if (offerId) {
    const current = await checkOfferCurrent({
      businessId,
      offerId,
      expectedUpdatedAt,
    });
    if (current.result !== "ok") {
      return refused(previous, formData, {
        errors: {},
        formError: current.result,
      });
    }
    storedStatus = current.status;
  }
  const values = readOfferValues((name) => formData.get(name));
  const parsed = parseOfferForm(values, {
    now: new Date(),
    // An offer that has already ended may be edited without moving its end,
    // but a draft or paused one cannot be switched on with an end in the past.
    allowPastEnd:
      offerId !== undefined &&
      (values.status !== "active" || storedStatus === "active"),
  });
  if (!parsed.ok) {
    return refused(previous, formData, {
      errors: parsed.errors,
      formError: null,
    });
  }
  const image = await readContentImageChange(
    formData,
    businessId,
    "offer",
    offerId,
    // The description of a shared picture changes only once the save is accepted.
    { deferAltUpdate: true },
  );
  if (!image.ok) {
    return refused(previous, formData, {
      errors: {},
      formError: image.outcome as OfferFormError,
    });
  }
  const result = await saveStudioOffer({
    businessId,
    offerId,
    expectedUpdatedAt,
    offer: parsed.offer,
    imageMediaId: image.imageMediaId,
  });
  if (result !== "saved") {
    // The upload happened first; do not leave it behind when the save failed.
    await releaseContentImageIfUnused({
      businessId,
      mediaId: image.uploadedMediaId,
    });
    return refused(previous, formData, { errors: {}, formError: result });
  }
  await recordAdminAudit({
    actorUserId,
    action: "business.offer_saved",
    targetType: "business",
    targetId: businessId,
    metadata: { via: "offers_studio", created: offerId === undefined },
  });
  if (offerId && image.pendingAltText) {
    const described = await applyContentImageAlt({
      businessId,
      kind: "offer",
      itemId: offerId,
      altText: image.pendingAltText,
    });
    if (described !== "updated") backTo(businessId, "picture-text", offerId);
  }
  backTo(businessId, offerId ? "saved" : "created", offerId);
}

const quickOutcomes: Record<string, string> = {
  publish: "published",
  resume: "resumed",
  pause: "paused",
  endNow: "ended",
  extend: "extended",
  duplicate: "duplicated",
};

/** Publish, pause, resume, end now, extend or duplicate one offer. */
export async function offerQuickAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");
  const offerId = optionalId(formData.get("offerId"));
  const action = formData.get("action");
  if (!offerId || !isQuickAction(action)) backTo(businessId, "invalid");
  const { t } = await getTranslator();
  const result = await applyOfferQuickAction({
    businessId,
    offerId,
    action,
    days: Number(formData.get("days") ?? 0),
    copySuffix: t("ostudio.copySuffix"),
  });
  if (result === "done") {
    await recordAdminAudit({
      actorUserId,
      action: "business.offer_state_changed",
      targetType: "business_offer",
      targetId: offerId,
      metadata: { businessId, change: action },
    });
    backTo(businessId, quickOutcomes[action] ?? "saved", offerId);
  }
  backTo(businessId, result, offerId);
}

export async function removeOfferStudioAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");
  const offerId = optionalId(formData.get("offerId"));
  if (!offerId) backTo(businessId, "invalid");
  const result = await removeBusinessOffer(businessId, offerId);
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.offer_removed",
      targetType: "business_offer",
      targetId: offerId,
      metadata: { businessId, via: "offers_studio" },
    });
    backTo(businessId, "removed");
  }
  backTo(businessId, result);
}
