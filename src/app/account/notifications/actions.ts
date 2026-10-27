"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import {
  parseNotificationGroup,
  parsePage,
  type NotificationGroup,
} from "@/modules/residents/notification-model";
import {
  clearReadNotifications,
  deleteNotification,
  markAllNotificationsRead,
  setNotificationRead,
  type NotificationMutation,
} from "@/modules/residents/notifications";

const identifierSchema = z.uuid();

function destination(
  group: NotificationGroup,
  page: number,
  outcome: NotificationMutation | "invalid" | "forbidden",
): Route {
  const query = new URLSearchParams();
  if (group !== "all") query.set("group", group);
  if (page > 1) query.set("page", String(page));
  query.set("outcome", outcome);
  return `/account/notifications?${query.toString()}` as Route;
}

async function runMutation(
  formData: FormData,
  mutation: (userId: string) => Promise<NotificationMutation>,
): Promise<never> {
  const group = parseNotificationGroup(String(formData.get("group") ?? ""));
  const page = parsePage(String(formData.get("page") ?? ""));
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) {
    redirect(
      `/login?next=${encodeURIComponent("/account/notifications")}` as Route,
    );
  }
  if (
    isPublicDemoEmail(session.user.email) ||
    !identifierSchema.safeParse(session.user.id).success
  ) {
    redirect(destination(group, page, "forbidden"));
  }
  redirect(destination(group, page, await mutation(session.user.id)));
}

function readId(formData: FormData): string | null {
  const parsed = identifierSchema.safeParse(
    String(formData.get("itemId") ?? ""),
  );
  return parsed.success ? parsed.data : null;
}

function itemAction(
  run: (userId: string, itemId: string) => Promise<NotificationMutation>,
) {
  return async (formData: FormData): Promise<never> => {
    const itemId = readId(formData);
    if (!itemId) {
      redirect(
        destination(
          parseNotificationGroup(String(formData.get("group") ?? "")),
          parsePage(String(formData.get("page") ?? "")),
          "invalid",
        ),
      );
    }
    return runMutation(formData, (userId) => run(userId, itemId));
  };
}

export const markNotificationReadAction = itemAction((userId, id) =>
  setNotificationRead(userId, id, true),
);
export const markNotificationUnreadAction = itemAction((userId, id) =>
  setNotificationRead(userId, id, false),
);
export const dismissNotificationAction = itemAction(deleteNotification);

export async function markAllNotificationsReadAction(
  formData: FormData,
): Promise<never> {
  return runMutation(formData, markAllNotificationsRead);
}

export async function clearReadNotificationsAction(
  formData: FormData,
): Promise<never> {
  return runMutation(formData, clearReadNotifications);
}
