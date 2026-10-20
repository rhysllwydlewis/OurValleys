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
import {
  cancelUpcomingSeriesEvents,
  removeBusinessEvent,
} from "@/modules/businesses/content-features";
import {
  applyEventQuickAction,
  checkEventCurrent,
  saveStudioEvent,
} from "@/modules/businesses/event-studio";
import {
  initialEventFormState,
  isQuickAction,
  parseEventForm,
  readEventValues,
  type EventFormError,
  type EventFormState,
} from "@/modules/businesses/event-studio-model";
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

function backTo(businessId: string, outcome: string, eventId?: string): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  const query = new URLSearchParams({ outcome });
  const anchor =
    eventId && z.uuid().safeParse(eventId).success ? `#event-${eventId}` : "";
  redirect(`/dashboard/business/${businessId}/events?${query}${anchor}`);
}

function optionalId(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "");
  return z.uuid().safeParse(text).success ? text : undefined;
}

function refused(
  previous: EventFormState,
  formData: FormData,
  change: Pick<EventFormState, "errors" | "formError">,
): EventFormState {
  return {
    status: "error",
    errors: change.errors,
    formError: change.formError,
    values: readEventValues((name) => formData.get(name)),
    attempt: previous.attempt + 1,
  };
}

/**
 * Creates or edits an event. A refused form returns field-level error codes
 * and the values typed (translated and re-shown by the client); a saved one
 * returns to the studio list.
 */
export async function saveEventStudioAction(
  previous: EventFormState = initialEventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) {
    return refused(previous, formData, { errors: {}, formError: "forbidden" });
  }
  const rawEventId = String(formData.get("eventId") ?? "");
  // An edit form always carries its id; a damaged one must not become a create.
  if (rawEventId && !z.uuid().safeParse(rawEventId).success) {
    return refused(previous, formData, { errors: {}, formError: "invalid" });
  }
  const eventId = rawEventId || undefined;
  const expected = Number(formData.get("expectedUpdatedAt"));
  const expectedUpdatedAt =
    eventId && Number.isFinite(expected) && expected > 0 ? expected : undefined;
  let storedStatus: string | undefined;
  if (eventId) {
    const current = await checkEventCurrent({
      businessId,
      eventId,
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
  const values = readEventValues((name) => formData.get(name));
  const parsed = parseEventForm(values, {
    now: new Date(),
    isNew: eventId === undefined,
    // An event that is already over may be tidied or cancelled without moving
    // its date, but it cannot be switched on in the past.
    goingLive: values.status === "active" && storedStatus !== "active",
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
    "event",
    eventId,
    // The description of a shared picture changes only once the save is accepted.
    { deferAltUpdate: true },
  );
  if (!image.ok) {
    return refused(previous, formData, {
      errors: {},
      formError: image.outcome as EventFormError,
    });
  }
  const result = await saveStudioEvent({
    businessId,
    eventId,
    expectedUpdatedAt,
    event: parsed.event,
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
    action: "business.event_saved",
    targetType: "business",
    targetId: businessId,
    metadata: {
      via: "events_studio",
      created: eventId === undefined,
      repeats: parsed.event.repeat?.occurrences ?? 1,
    },
  });
  if (eventId && image.pendingAltText) {
    const described = await applyContentImageAlt({
      businessId,
      kind: "event",
      itemId: eventId,
      altText: image.pendingAltText,
    });
    if (described !== "updated") backTo(businessId, "picture-text", eventId);
  }
  backTo(
    businessId,
    eventId ? "saved" : parsed.event.repeat ? "createdSeries" : "created",
    eventId,
  );
}

const quickOutcomes: Record<string, string> = {
  publish: "published",
  resume: "resumed",
  pause: "paused",
  cancel: "cancelled",
  reopen: "reopened",
  postpone: "postponed",
  duplicate: "duplicated",
};

/** Publish, pause, resume, cancel, reopen, postpone or copy one event. */
export async function eventQuickAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");
  const eventId = optionalId(formData.get("eventId"));
  const action = formData.get("action");
  if (!eventId || !isQuickAction(action)) backTo(businessId, "invalid");
  const { t } = await getTranslator();
  const result = await applyEventQuickAction({
    businessId,
    eventId,
    action,
    days: Number(formData.get("days") ?? 0),
    copySuffix: t("evstudio.copySuffix"),
  });
  if (result === "done") {
    await recordAdminAudit({
      actorUserId,
      action: "business.event_state_changed",
      targetType: "business_event",
      targetId: eventId,
      metadata: { businessId, change: action },
    });
    backTo(businessId, quickOutcomes[action] ?? "saved", eventId);
  }
  backTo(businessId, result, eventId);
}

/** Cancels every upcoming date of the series this event belongs to. */
export async function cancelSeriesStudioAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");
  const eventId = optionalId(formData.get("eventId"));
  if (!eventId) backTo(businessId, "invalid");
  const result = await cancelUpcomingSeriesEvents(businessId, eventId);
  if (result.outcome === "cancelled") {
    await recordAdminAudit({
      actorUserId,
      action: "business.event_series_cancelled",
      targetType: "business_event",
      targetId: eventId,
      metadata: { businessId, count: result.count, via: "events_studio" },
    });
    backTo(businessId, "seriesCancelled", eventId);
  }
  backTo(businessId, result.outcome, eventId);
}

export async function removeEventStudioAction(
  formData: FormData,
): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");
  const eventId = optionalId(formData.get("eventId"));
  if (!eventId) backTo(businessId, "invalid");
  const result = await removeBusinessEvent(businessId, eventId);
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.event_removed",
      targetType: "business_event",
      targetId: eventId,
      metadata: { businessId, via: "events_studio" },
    });
    backTo(businessId, "removed");
  }
  backTo(businessId, result);
}
