"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  applyUnsubscribe,
  isNotificationCategory,
} from "@/lib/notification-unsubscribe";

export async function unsubscribeAction(formData: FormData): Promise<void> {
  const category = String(formData.get("category") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const token = String(formData.get("token") ?? "");

  if (
    !isNotificationCategory(category) ||
    !z.uuid().safeParse(subjectId).success
  ) {
    redirect(
      `/unsubscribe/${encodeURIComponent(category)}/${encodeURIComponent(subjectId)}/${encodeURIComponent(token)}?outcome=invalid`,
    );
  }

  const result = await applyUnsubscribe(category, subjectId, token);
  redirect(`/unsubscribe/${category}/${subjectId}/${token}?outcome=${result}`);
}
