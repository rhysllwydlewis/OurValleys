"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { canUseBusinessOperationsTools } from "@/lib/public-demo-policy";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import {
  initialUpdateFormState,
  isUpdateIntent,
  parseUpdateForm,
  readUpdateValues,
  type UpdateFormError,
  type UpdateFormState,
} from "@/modules/businesses/updates-model";
import {
  removeStudioUpdate,
  saveStudioUpdate,
  setStudioUpdateState,
} from "@/modules/businesses/updates";

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

function backTo(businessId: string, outcome: string, updateId?: string): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  const query = new URLSearchParams({ outcome });
  const anchor =
    updateId && z.uuid().safeParse(updateId).success
      ? `#update-${updateId}`
      : "";
  redirect(`/dashboard/business/${businessId}/updates?${query}${anchor}`);
}

function optionalId(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "");
  return z.uuid().safeParse(text).success ? text : undefined;
}

function refused(
  previous: UpdateFormState,
  formData: FormData,
  change: Pick<UpdateFormState, "errors" | "formError">,
): UpdateFormState {
  return {
    status: "error",
    errors: change.errors,
    formError: change.formError,
    values: readUpdateValues((name) => formData.get(name)),
    attempt: previous.attempt + 1,
  };
}

/**
 * Creates or edits an update. A refused form returns field-level error codes
 * and the values typed (translated and re-shown by the client); a saved one
 * returns to the studio list.
 */
export async function saveUpdateAction(
  previous: UpdateFormState = initialUpdateFormState,
  formData: FormData,
): Promise<UpdateFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) {
    return refused(previous, formData, { errors: {}, formError: "forbidden" });
  }
  const rawUpdateId = String(formData.get("updateId") ?? "");
  // An edit form always carries its id; a damaged one must not become a create.
  if (rawUpdateId && !z.uuid().safeParse(rawUpdateId).success) {
    return refused(previous, formData, { errors: {}, formError: "invalid" });
  }
  const updateId = rawUpdateId || undefined;
  const expected = Number(formData.get("expectedUpdatedAt"));
  const expectedUpdatedAt =
    updateId && Number.isFinite(expected) && expected > 0
      ? expected
      : undefined;
  // The stale-save check cannot be skipped by omitting or damaging the stamp.
  if (updateId && expectedUpdatedAt === undefined) {
    return refused(previous, formData, { errors: {}, formError: "invalid" });
  }
  const intent = formData.get("intent");
  if (!isUpdateIntent(intent)) {
    return refused(previous, formData, { errors: {}, formError: "invalid" });
  }
  const parsed = parseUpdateForm(
    readUpdateValues((name) => formData.get(name)),
  );
  if (!parsed.ok) {
    return refused(previous, formData, {
      errors: parsed.errors,
      formError: null,
    });
  }
  const outcome = await saveStudioUpdate({
    businessId,
    updateId,
    expectedUpdatedAt,
    update: parsed.update,
    intent,
  });
  if (outcome.result !== "saved") {
    return refused(previous, formData, {
      errors: {},
      formError: outcome.result as UpdateFormError,
    });
  }
  await recordAdminAudit({
    actorUserId,
    action: "business.update_saved",
    targetType: "business_update",
    targetId: outcome.id ?? businessId,
    metadata: {
      businessId,
      created: updateId === undefined,
      published: outcome.status === "published",
      newlyPublished: outcome.newlyPublished === true,
    },
  });
  backTo(
    businessId,
    outcome.newlyPublished ? "published" : updateId ? "saved" : "draftSaved",
    outcome.id,
  );
}

/** Publish or unpublish one update. */
export async function updateStateAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");
  const updateId = optionalId(formData.get("updateId"));
  const to = formData.get("to");
  if (!updateId || (to !== "published" && to !== "draft")) {
    backTo(businessId, "invalid");
  }
  const result = await setStudioUpdateState({ businessId, updateId, to });
  if (result === "done") {
    await recordAdminAudit({
      actorUserId,
      action: "business.update_state_changed",
      targetType: "business_update",
      targetId: updateId,
      metadata: { businessId, to },
    });
    backTo(
      businessId,
      to === "published" ? "published" : "unpublished",
      updateId,
    );
  }
  backTo(businessId, result, updateId);
}

export async function removeUpdateAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await contentActor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");
  const updateId = optionalId(formData.get("updateId"));
  if (!updateId) backTo(businessId, "invalid");
  const result = await removeStudioUpdate({ businessId, updateId });
  if (result === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.update_removed",
      targetType: "business_update",
      targetId: updateId,
      metadata: { businessId },
    });
    backTo(businessId, "removed");
  }
  backTo(businessId, result);
}
