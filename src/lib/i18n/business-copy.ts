import type {
  BusinessAccentKey,
  BusinessSectionId,
  BusinessSectionLayouts,
  BusinessTemplateKey,
} from "@/modules/businesses/appearance";
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

const templateMessages: Record<
  BusinessTemplateKey,
  { name: MessageKey; description: MessageKey }
> = {
  standard: {
    name: "design.template.standard.name",
    description: "design.template.standard.description",
  },
  warm: {
    name: "design.template.warm.name",
    description: "design.template.warm.description",
  },
  bold: {
    name: "design.template.bold.name",
    description: "design.template.bold.description",
  },
};

export function templateCopy(t: Translator, key: BusinessTemplateKey) {
  const messages = templateMessages[key];
  return { name: t(messages.name), description: t(messages.description) };
}

const accentMessages: Record<BusinessAccentKey, MessageKey> = {
  "valley-green": "design.accent.valley-green",
  "slate-blue": "design.accent.slate-blue",
  heather: "design.accent.heather",
  bracken: "design.accent.bracken",
};

export function accentName(t: Translator, key: BusinessAccentKey): string {
  return t(accentMessages[key]);
}

const sectionMessages: Record<BusinessSectionId, MessageKey> = {
  about: "design.section.about",
  services: "design.section.services",
  gallery: "design.section.gallery",
  location: "design.section.location",
  hours: "design.section.hours",
  contact: "design.section.contact",
  offers: "design.section.offers",
  events: "design.section.events",
  menu: "design.section.menu",
  accessibility: "design.section.accessibility",
};

export function sectionLabel(t: Translator, id: BusinessSectionId): string {
  return t(sectionMessages[id]);
}

const layoutMessages: {
  [S in BusinessSectionId]: Record<BusinessSectionLayouts[S], MessageKey>;
} = {
  about: {
    split: "design.layout.about.split",
    stacked: "design.layout.about.stacked",
  },
  services: {
    cards: "design.layout.services.cards",
    list: "design.layout.services.list",
  },
  gallery: {
    grid: "design.layout.gallery.grid",
    feature: "design.layout.gallery.feature",
  },
  location: {
    panel: "design.layout.location.panel",
    statement: "design.layout.location.statement",
  },
  hours: {
    list: "design.layout.hours.list",
    compact: "design.layout.hours.compact",
  },
  contact: {
    panel: "design.layout.contact.panel",
    buttons: "design.layout.contact.buttons",
  },
  offers: {
    cards: "design.layout.offers.cards",
    list: "design.layout.offers.list",
  },
  events: {
    cards: "design.layout.events.cards",
    timeline: "design.layout.events.timeline",
  },
  menu: {
    columns: "design.layout.menu.columns",
    compact: "design.layout.menu.compact",
  },
  accessibility: {
    chips: "design.layout.accessibility.chips",
    list: "design.layout.accessibility.list",
  },
};

export function layoutName(
  t: Translator,
  section: BusinessSectionId,
  layout: string,
): string {
  const messages: Record<string, MessageKey | undefined> =
    layoutMessages[section];
  const key = messages[layout];
  return key ? t(key) : layout;
}
