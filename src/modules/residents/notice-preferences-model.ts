import type { MessageKey } from "@/lib/i18n/translate";
import {
  NOTIFICATION_KINDS,
  type NotificationKind,
} from "./notification-model";

/** One switch on the privacy page: what it is called and what it covers. */
export type NoticePreferenceOption = {
  kind: NotificationKind;
  label: MessageKey;
  hint: MessageKey;
};

export const NOTICE_PREFERENCE_OPTIONS: readonly NoticePreferenceOption[] = [
  {
    kind: "saved_search_results",
    label: "privacy.kind.search.label",
    hint: "privacy.kind.search.hint",
  },
  {
    kind: "event_reminder",
    label: "privacy.kind.event.label",
    hint: "privacy.kind.event.hint",
  },
  {
    kind: "place_digest",
    label: "privacy.kind.digest.label",
    hint: "privacy.kind.digest.hint",
  },
  {
    kind: "followed_update",
    label: "privacy.kind.followedUpdate.label",
    hint: "privacy.kind.followedUpdate.hint",
  },
  {
    kind: "followed_offer",
    label: "privacy.kind.followedOffer.label",
    hint: "privacy.kind.followedOffer.hint",
  },
  {
    kind: "followed_event",
    label: "privacy.kind.followedEvent.label",
    hint: "privacy.kind.followedEvent.hint",
  },
  {
    kind: "owner_digest",
    label: "privacy.kind.owner.label",
    hint: "privacy.kind.owner.hint",
  },
];

/**
 * Turns the submitted switches into the kinds that stay on. Only known kinds
 * count and each counts once, so a forged or repeated value changes nothing.
 */
export function readEnabledKinds(
  values: readonly unknown[],
): NotificationKind[] {
  const wanted = new Set(
    values.filter((v): v is string => typeof v === "string"),
  );
  return NOTIFICATION_KINDS.filter((kind) => wanted.has(kind));
}

/** The kinds a person has switched off, given the ones left on. */
export function mutedKindsFor(
  enabled: readonly NotificationKind[],
): NotificationKind[] {
  const on = new Set<NotificationKind>(enabled);
  return NOTIFICATION_KINDS.filter((kind) => !on.has(kind));
}

export type PreferenceOutcome =
  "saved" | "invalid" | "forbidden" | "unavailable";

export function parsePreferenceOutcome(
  value: string | string[] | undefined,
): PreferenceOutcome | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "saved" ||
    first === "invalid" ||
    first === "forbidden" ||
    first === "unavailable"
    ? first
    : null;
}
