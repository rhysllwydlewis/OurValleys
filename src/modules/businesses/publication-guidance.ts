import type { BusinessLifecycleStatus } from "./publication";

export type PublicationGuidance = {
  label: string;
  chip: "complete" | "todo" | "planned";
  description: string;
  visibility: string;
  nextAction: string;
  rollback: string;
  canSubmit: boolean;
};

const guidanceByStatus: Record<BusinessLifecycleStatus, PublicationGuidance> = {
  draft: {
    label: "Not submitted",
    chip: "todo",
    description:
      "Your latest saved draft is private and has not been sent for publication review.",
    visibility: "Only authorised business members can view the generated preview.",
    nextAction:
      "Complete profile, location, services and opening hours, review the private preview, then submit when ready.",
    rollback:
      "Submitting does not publish anything. You can continue editing until a reviewer approves the profile.",
    canSubmit: true,
  },
  pending_review: {
    label: "In review",
    chip: "planned",
    description:
      "The submitted version is being checked by an OurValleys reviewer.",
    visibility:
      "The public site stays unchanged while review is in progress. Draft edits remain private.",
    nextAction:
      "Wait for the review outcome. If changes are requested, the reviewer note will appear here.",
    rollback:
      "Nothing new is live yet, so there is no public change to roll back during review.",
    canSubmit: false,
  },
  published: {
    label: "Published",
    chip: "complete",
    description: "The approved business profile is live in local discovery.",
    visibility:
      "Residents can view the approved public version. Later draft edits do not replace it automatically.",
    nextAction:
      "Use the private preview to check future edits before submitting another reviewed revision.",
    rollback:
      "The currently approved version remains live until another revision is approved or an administrator suspends it for safety.",
    canSubmit: false,
  },
  rejected: {
    label: "Changes requested",
    chip: "todo",
    description:
      "The submitted version was not approved. The reviewer note explains what must change.",
    visibility:
      "The rejected draft is private. Any previously approved public version is not replaced by it.",
    nextAction:
      "Address the reviewer note, verify the generated preview, then resubmit the corrected draft.",
    rollback:
      "Because the rejected revision never went live, no rollback is required.",
    canSubmit: true,
  },
  suspended: {
    label: "Suspended",
    chip: "todo",
    description:
      "The public profile has been taken out of discovery while the recorded concern is resolved.",
    visibility: "Residents cannot access the suspended public listing.",
    nextAction:
      "Review the suspension reason and contact the platform team after correcting the underlying issue.",
    rollback:
      "Reinstatement is an administrator-controlled action and restores the approved profile only after the concern is resolved.",
    canSubmit: false,
  },
};

export function getPublicationGuidance(status: string): PublicationGuidance {
  return guidanceByStatus[status as BusinessLifecycleStatus] ?? guidanceByStatus.draft;
}
