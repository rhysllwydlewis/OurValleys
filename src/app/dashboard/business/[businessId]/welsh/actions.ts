"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { canUseBusinessAppearanceTools } from "@/lib/public-demo-policy";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import {
  offerFieldName,
  parseTranslationForm,
  serviceFieldName,
} from "@/modules/businesses/translation-model";
import {
  readWelshContent,
  saveBusinessTranslation,
} from "@/modules/businesses/translations";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import type { WelshFormState, WelshFormValues } from "./state";

async function readAuthorisedEditor(
  businessId: string,
): Promise<string | null> {
  if (!z.uuid().safeParse(businessId).success) return null;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) return null;
    if (!canUseBusinessAppearanceTools(session.user.email)) return null;
    const authorised = await canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.editProfile,
    });
    return authorised ? session.user.id : null;
  } catch {
    return null;
  }
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function saveWelshVersionAction(
  _previous: WelshFormState,
  formData: FormData,
): Promise<WelshFormState> {
  const businessId = text(formData, "businessId");
  const actorUserId = await readAuthorisedEditor(businessId);
  if (!actorUserId) {
    return {
      status: "forbidden",
      errors: { services: {}, offers: {} },
      values: null,
    };
  }

  let content;
  try {
    content = await readWelshContent(businessId);
  } catch {
    return {
      status: "unavailable",
      errors: { services: {}, offers: {} },
      values: null,
    };
  }

  const values: WelshFormValues = {
    summary: text(formData, "summary"),
    description: text(formData, "description"),
    services: Object.fromEntries(
      content.services.map((item) => [
        item.id,
        {
          name: text(formData, serviceFieldName(item.id, "name")),
          description: text(formData, serviceFieldName(item.id, "description")),
        },
      ]),
    ),
    offers: Object.fromEntries(
      content.offers.map((item) => [
        item.id,
        {
          title: text(formData, offerFieldName(item.id, "title")),
          description: text(formData, offerFieldName(item.id, "description")),
        },
      ]),
    ),
  };

  const parsed = parseTranslationForm(
    (name) => formData.get(name),
    content.services.map((item) => item.id),
    content.offers.map((item) => item.id),
  );
  if (!parsed.ok) {
    return { status: "invalid", errors: parsed.errors, values };
  }

  const result = await saveBusinessTranslation({
    businessId,
    actorUserId,
    value: parsed.value,
  });
  if (result.status !== "saved") {
    return {
      status: "unavailable",
      errors: { services: {}, offers: {} },
      values,
    };
  }

  const servicesTranslated = Object.values(parsed.value.services).filter(
    (item) => item.name !== null || item.description !== null,
  ).length;
  const offersTranslated = Object.values(parsed.value.offers).filter(
    (item) => item.title !== null || item.description !== null,
  ).length;
  const anything =
    parsed.value.summary !== null ||
    parsed.value.description !== null ||
    servicesTranslated > 0 ||
    offersTranslated > 0;
  // Field names only: the owner's wording is public content but does not
  // belong in the audit trail.
  await recordAdminAudit({
    actorUserId,
    action: "business.welsh_content_updated",
    targetType: "business",
    targetId: businessId,
    metadata: {
      summary: parsed.value.summary !== null,
      description: parsed.value.description !== null,
      servicesTranslated,
      offersTranslated,
    },
  });
  revalidatePath(`/dashboard/business/${businessId}/welsh`);
  return {
    status: anything ? "saved" : "cleared",
    errors: { services: {}, offers: {} },
    values: null,
  };
}
