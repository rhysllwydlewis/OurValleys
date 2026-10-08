export const businessOnboardingSteps = [
  {
    key: "profile",
    title: "Business profile",
    description: "Add the trading name, summary and public contact details.",
  },
  {
    key: "location",
    title: "Location and service area",
    description: "Choose a primary place and a safe public address visibility.",
  },
  {
    key: "services",
    title: "Services",
    description:
      "Describe what the business provides and how prices are presented.",
  },
  {
    key: "hours",
    title: "Opening hours",
    description: "Set regular hours and prepare for future exceptions.",
  },
  {
    key: "attributes",
    title: "Accessibility and services",
    description:
      "Let residents know about accessibility, Welsh-speaking and other practical details. Optional.",
  },
  {
    key: "preview",
    title: "Website preview",
    description: "Review the generated site before any publication decision.",
  },
  {
    key: "publish",
    title: "Publish readiness",
    description:
      "Resolve required checks before publishing the canonical profile.",
  },
] as const;

export type BusinessOnboardingStepKey =
  (typeof businessOnboardingSteps)[number]["key"];

const validStepKeys = new Set<BusinessOnboardingStepKey>(
  businessOnboardingSteps.map((step) => step.key),
);

export type BusinessOnboardingProgress = {
  completed: BusinessOnboardingStepKey[];
  remaining: BusinessOnboardingStepKey[];
  completedCount: number;
  totalCount: number;
  percentage: number;
};

export function calculateBusinessOnboardingProgress(
  completedInput: readonly string[],
): BusinessOnboardingProgress {
  const completedSet = new Set<BusinessOnboardingStepKey>();

  for (const key of completedInput) {
    if (validStepKeys.has(key as BusinessOnboardingStepKey)) {
      completedSet.add(key as BusinessOnboardingStepKey);
    }
  }

  const completed = businessOnboardingSteps
    .map((step) => step.key)
    .filter((key) => completedSet.has(key));
  const remaining = businessOnboardingSteps
    .map((step) => step.key)
    .filter((key) => !completedSet.has(key));
  const totalCount = businessOnboardingSteps.length;
  const completedCount = completed.length;

  return {
    completed,
    remaining,
    completedCount,
    totalCount,
    percentage: Math.round((completedCount / totalCount) * 100),
  };
}

export type PreviewStepState = {
  chip: "todo" | "planned";
  label: string;
  note: string;
};

/**
 * The preview itself is always reachable, but it only shows real content once
 * the profile and location are drafted. It is never reported as "complete"
 * because nothing records that an owner has looked at it.
 */
export function describePreviewStep(
  completedInput: readonly string[],
  options: { published?: boolean } = {},
): PreviewStepState {
  const completed = new Set(completedInput);
  // A published business already has a live profile and location, even when
  // its saved draft has not been edited since.
  if (
    options.published ||
    (completed.has("profile") && completed.has("location"))
  ) {
    return {
      chip: "todo",
      label: "Ready to preview",
      note: "Your profile and location are drafted. Open the preview to check how the website reads before you publish.",
    };
  }
  return {
    chip: "planned",
    label: "Needs profile and location",
    note: "Draft your business profile and location first so the preview shows real content. You can still open it at any time.",
  };
}
