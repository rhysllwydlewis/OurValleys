import type { MessageKey } from "@/lib/i18n/translate";

export const NOTIFICATION_KINDS = [
  "saved_search_results",
  "event_reminder",
  "place_digest",
  "owner_digest",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_PAGE_SIZE = 20;
/** Rows kept per person; the oldest read ones go first when raising more. */
export const MAX_NOTIFICATIONS_PER_USER = 200;
/** Read notifications older than this are removed by the retention job. */
export const READ_NOTIFICATION_RETENTION_DAYS = 90;
export const MAX_PARAM_LENGTH = 120;

export type NotificationParams = Record<string, string | number>;

/** What the inbox shows for each kind: icon word, message keys and group. */
export const NOTIFICATION_KIND_DETAILS: Record<
  NotificationKind,
  {
    title: MessageKey;
    titleOne?: MessageKey;
    body: MessageKey;
    group: NotificationGroup;
  }
> = {
  saved_search_results: {
    title: "notif.kind.search.title",
    titleOne: "notif.kind.search.titleOne",
    body: "notif.kind.search.body",
    group: "saved",
  },
  event_reminder: {
    title: "notif.kind.event.title",
    body: "notif.kind.event.body",
    group: "saved",
  },
  place_digest: {
    title: "notif.kind.digest.title",
    titleOne: "notif.kind.digest.titleOne",
    body: "notif.kind.digest.body",
    group: "saved",
  },
  owner_digest: {
    title: "notif.kind.owner.title",
    body: "notif.kind.owner.body",
    group: "business",
  },
};

export const NOTIFICATION_GROUPS = ["all", "saved", "business"] as const;
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

export function parseNotificationGroup(
  value: string | string[] | undefined,
): NotificationGroup {
  const first = Array.isArray(value) ? value[0] : value;
  return (NOTIFICATION_GROUPS as readonly string[]).includes(first ?? "")
    ? (first as NotificationGroup)
    : "all";
}

export function kindsInGroup(group: NotificationGroup): NotificationKind[] {
  if (group === "all") return [...NOTIFICATION_KINDS];
  return NOTIFICATION_KINDS.filter(
    (kind) => NOTIFICATION_KIND_DETAILS[kind].group === group,
  );
}

export function parsePage(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(first ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000 ? parsed : 1;
}

/** A site-relative path or nothing: never an absolute or protocol-relative URL. */
export function safeNotificationHref(
  value: string | null | undefined,
): string | null {
  if (!value || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\u0000-\u001f\\]/.test(value)) return null;
  return value;
}

/** Keeps parameters short, plain text, and free of markup characters. */
export function cleanParams(params: NotificationParams): NotificationParams {
  const clean: NotificationParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (!/^\w{1,24}$/.test(key)) continue;
    clean[key] =
      typeof value === "number"
        ? Number.isFinite(value)
          ? Math.trunc(value)
          : 0
        : value
            .replace(/[\u0000-\u001f<>]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, MAX_PARAM_LENGTH);
  }
  return clean;
}

export type NotificationDraft = {
  kind: NotificationKind;
  params?: NotificationParams;
  href?: string | null;
  dedupeKey?: string | null;
};

/** Message keys and parameters for one stored notification. */
export function describeNotification(
  kind: NotificationKind,
  params: NotificationParams,
): { title: MessageKey; body: MessageKey } {
  const details = NOTIFICATION_KIND_DETAILS[kind];
  const count = typeof params.count === "number" ? params.count : null;
  return {
    title: count === 1 && details.titleOne ? details.titleOne : details.title,
    body: details.body,
  };
}

export function parseKind(value: string): NotificationKind | null {
  return (NOTIFICATION_KINDS as readonly string[]).includes(value)
    ? (value as NotificationKind)
    : null;
}

/** "9", "99+" for the bell badge. */
export function unreadBadge(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

export function totalPages(total: number): number {
  return Math.max(1, Math.ceil(total / NOTIFICATION_PAGE_SIZE));
}
