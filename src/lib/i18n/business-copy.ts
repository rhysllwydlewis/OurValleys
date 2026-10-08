import type { BusinessAttributeKey } from "@/modules/businesses/attribute-definitions";
import type { BusinessOnboardingStepKey } from "@/modules/businesses/onboarding";
import type { PreviewStepState } from "@/modules/businesses/onboarding";
import type { PublicationGuidance } from "@/modules/businesses/publication-guidance";
import type { MessageKey, Translator } from "./translate";

/**
 * The owner dashboard's domain copy (checklist steps, publication guidance,
 * attribute labels, weekdays) is defined in English next to the rules that use
 * it. This module maps each domain key to its catalogue entry, so a new key
 * without a message fails the type check instead of silently staying English.
 * Pure and framework-free: usable from server and client components.
 */

export const weekdayKeys = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type WeekdayKey = (typeof weekdayKeys)[number];

const stepMessages: Record<
  BusinessOnboardingStepKey,
  { title: MessageKey; description: MessageKey }
> = {
  profile: {
    title: "dash.step.profile.title",
    description: "dash.step.profile.description",
  },
  location: {
    title: "dash.step.location.title",
    description: "dash.step.location.description",
  },
  services: {
    title: "dash.step.services.title",
    description: "dash.step.services.description",
  },
  hours: {
    title: "dash.step.hours.title",
    description: "dash.step.hours.description",
  },
  attributes: {
    title: "dash.step.attributes.title",
    description: "dash.step.attributes.description",
  },
  preview: {
    title: "dash.step.preview.title",
    description: "dash.step.preview.description",
  },
  publish: {
    title: "dash.step.publish.title",
    description: "dash.step.publish.description",
  },
};

export function onboardingStepCopy(
  t: Translator,
  key: BusinessOnboardingStepKey,
) {
  const messages = stepMessages[key];
  return { title: t(messages.title), description: t(messages.description) };
}

/** A step name for a free-form key (the server reports missing steps by key). */
export function onboardingStepTitle(t: Translator, key: string): string {
  return key in stepMessages
    ? t(stepMessages[key as BusinessOnboardingStepKey].title)
    : key;
}

const previewMessages: Record<
  PreviewStepState["variant"],
  { label: MessageKey; note: MessageKey }
> = {
  published: {
    label: "dash.preview.published.label",
    note: "dash.preview.published.note",
  },
  ready: {
    label: "dash.preview.ready.label",
    note: "dash.preview.ready.note",
  },
  needsDraft: {
    label: "dash.preview.needsDraft.label",
    note: "dash.preview.needsDraft.note",
  },
};

export function previewStepCopy(t: Translator, step: PreviewStepState) {
  const messages = previewMessages[step.variant];
  return { label: t(messages.label), note: t(messages.note) };
}

type GuidanceStatus =
  "draft" | "pending_review" | "published" | "rejected" | "suspended";

const guidanceStatuses: readonly GuidanceStatus[] = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "suspended",
];

/** Falls back to the draft wording, matching `getPublicationGuidance`. */
export function publicationGuidanceCopy(
  t: Translator,
  status: string,
  guidance: PublicationGuidance,
) {
  const key: GuidanceStatus = guidanceStatuses.includes(
    status as GuidanceStatus,
  )
    ? (status as GuidanceStatus)
    : "draft";
  return {
    ...guidance,
    label: t(`dash.guidance.${key}.label`),
    description: t(`dash.guidance.${key}.description`),
    visibility: t(`dash.guidance.${key}.visibility`),
    nextAction: t(`dash.guidance.${key}.nextAction`),
    rollback: t(`dash.guidance.${key}.rollback`),
  };
}

export function attributeCopy(t: Translator, key: BusinessAttributeKey) {
  return {
    label: t(`dash.attr.${key}.label`),
    description: t(`dash.attr.${key}.description`),
  };
}

export function weekdayLabel(t: Translator, day: string): string {
  return (weekdayKeys as readonly string[]).includes(day)
    ? t(`dash.day.${day as WeekdayKey}`)
    : day;
}

/** The label for a membership role, in lower case as the dashboard tag shows it. */
export function memberRoleTag(t: Translator, role: string): string {
  switch (role) {
    case "owner":
      return t("dash.role.owner");
    case "manager":
      return t("dash.role.manager");
    case "editor":
      return t("dash.role.editor");
    case "viewer":
      return t("dash.role.viewer");
    default:
      return role;
  }
}

/**
 * Text that owners or staff typed (business names, summaries, services,
 * notes) has no recorded language. `lang=""` marks it as unknown, so inside a
 * Welsh interface it is not read out with Welsh pronunciation rules.
 */
export const authoredTextLang = "";
