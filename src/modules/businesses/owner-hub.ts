/**
 * Pure prioritisation behind the owner hub (`/dashboard/business/[id]`).
 *
 * The hub turns what the platform already knows about a business (setup
 * progress, publication state, enquiries waiting, content and contact
 * coverage) into a short, ordered list of next steps. Nothing here reads the
 * database or decides who may see it: the caller authorises first.
 */
import type { BusinessOnboardingStepKey } from "./onboarding";

export type OwnerHubStatus =
  "draft" | "pending_review" | "published" | "rejected" | "suspended";

export type OwnerHubFacts = {
  status: OwnerHubStatus;
  canEdit: boolean;
  canPublish: boolean;
  /**
   * Whether the viewer can open the content and insights page (all five
   * private-read permissions, and not the public development demo).
   */
  canOperate: boolean;
  /** Whether the viewer can open the website designer. */
  canDesign: boolean;
  /**
   * False when the draft could not be read. The setup steps are then unknown,
   * so no setup advice (including "ready to submit") is given.
   */
  setupKnown: boolean;
  /** Setup steps (profile, location, services, hours) still without a draft. */
  missingSetupSteps: readonly BusinessOnboardingStepKey[];
  /** Enquiries still `new` or `read`. */
  enquiriesWaiting: number;
  /** Oldest of those, in whole days (0 when none are waiting). */
  oldestEnquiryWaitDays: number;
  /** Visitor suggestions waiting for the owner to apply, decline or hand on. */
  correctionsWaiting: number;
  contactMethodCount: number;
  hasLogo: boolean;
  galleryCount: number;
  activeOfferCount: number;
  upcomingEventCount: number;
  weeklyDigestEnabled: boolean;
};

export const ownerHubStepIds = [
  "suspended",
  "changes_requested",
  "reply_enquiries",
  "review_corrections",
  "finish_profile",
  "finish_location",
  "finish_services",
  "finish_hours",
  "submit_for_review",
  "in_review",
  "add_contact",
  "add_logo",
  "add_photos",
  "add_offer",
  "add_event",
  "turn_on_digest",
] as const;

export type OwnerHubStepId = (typeof ownerHubStepIds)[number];

/** Where a step sends the owner. The page maps these to real routes. */
export type OwnerHubTarget =
  | "profile"
  | "website"
  | "preview"
  | "operations"
  | "inbox"
  | "corrections"
  | "contacts"
  | "offers"
  | "events"
  | "media"
  | "lifecycle"
  | "publish";

export type OwnerHubStep = {
  id: OwnerHubStepId;
  /** `urgent` needs attention now; `next` moves the setup on; `grow` is optional. */
  tone: "urgent" | "next" | "grow";
  target: OwnerHubTarget | null;
  /** Used to fill `{count}` / `{days}` in the step copy. */
  count?: number;
  days?: number;
};

export const OWNER_HUB_MAX_STEPS = 4;
/** An enquiry waiting this long is flagged as overdue rather than just waiting. */
export const OWNER_HUB_OVERDUE_ENQUIRY_DAYS = 3;

const setupStepTargets = {
  profile: "finish_profile",
  location: "finish_location",
  services: "finish_services",
  hours: "finish_hours",
} as const;

/**
 * Ordered next steps, most important first and at most
 * {@link OWNER_HUB_MAX_STEPS}. Members who cannot edit get no action list
 * (they can still see the figures), except that an enquiry waiting is shown
 * to everyone who may open the inbox. Suspension and requested changes always
 * lead because they block everything else.
 */
export function buildOwnerNextSteps(facts: OwnerHubFacts): OwnerHubStep[] {
  const steps: OwnerHubStep[] = [];

  if (facts.status === "suspended") {
    steps.push({
      id: "suspended",
      tone: "urgent",
      target: facts.canOperate ? "lifecycle" : null,
    });
  }
  if (facts.status === "rejected" && facts.canEdit) {
    steps.push({ id: "changes_requested", tone: "urgent", target: "profile" });
  }
  if (
    facts.enquiriesWaiting > 0 &&
    facts.canOperate &&
    facts.status !== "suspended"
  ) {
    steps.push({
      id: "reply_enquiries",
      tone:
        facts.oldestEnquiryWaitDays >= OWNER_HUB_OVERDUE_ENQUIRY_DAYS
          ? "urgent"
          : "next",
      target: "inbox",
      count: facts.enquiriesWaiting,
      days: facts.oldestEnquiryWaitDays,
    });
  }

  if (!facts.canEdit || facts.status === "suspended") {
    return steps.slice(0, OWNER_HUB_MAX_STEPS);
  }

  if (facts.correctionsWaiting > 0 && facts.status === "published") {
    steps.push({
      id: "review_corrections",
      tone: "next",
      target: "corrections",
      count: facts.correctionsWaiting,
    });
  }

  const setupOpen =
    facts.setupKnown &&
    (facts.status === "draft" || facts.status === "rejected");
  if (setupOpen) {
    for (const key of facts.missingSetupSteps) {
      if (key in setupStepTargets) {
        steps.push({
          id: setupStepTargets[key as keyof typeof setupStepTargets],
          tone: "next",
          target: "profile",
        });
      }
    }
    if (facts.missingSetupSteps.length === 0 && facts.canPublish) {
      steps.push({
        id: "submit_for_review",
        tone: "next",
        target: "publish",
      });
    }
  }
  if (facts.status === "pending_review") {
    steps.push({ id: "in_review", tone: "next", target: "preview" });
  }

  if (facts.canOperate && facts.contactMethodCount === 0) {
    steps.push({ id: "add_contact", tone: "grow", target: "contacts" });
  }
  if (facts.canDesign && !facts.hasLogo) {
    steps.push({ id: "add_logo", tone: "grow", target: "media" });
  } else if (facts.canDesign && facts.hasLogo && facts.galleryCount === 0) {
    steps.push({ id: "add_photos", tone: "grow", target: "media" });
  }
  if (facts.status === "published" && facts.canOperate) {
    if (facts.activeOfferCount === 0) {
      steps.push({ id: "add_offer", tone: "grow", target: "offers" });
    }
    if (facts.upcomingEventCount === 0) {
      steps.push({ id: "add_event", tone: "grow", target: "events" });
    }
    if (!facts.weeklyDigestEnabled) {
      steps.push({ id: "turn_on_digest", tone: "grow", target: "operations" });
    }
  }

  return steps.slice(0, OWNER_HUB_MAX_STEPS);
}

export type HubFigure = {
  key: "views" | "searches" | "contacts" | "enquiries";
  value: number;
  previous: number;
};

type HubTotals = {
  totalViews: number;
  searchAppearances: number;
  contactActions: number;
  enquiries: number;
};

/** The four headline figures, in the order the hub shows them. */
export function hubFigures(
  current: HubTotals,
  previous: HubTotals,
): HubFigure[] {
  return [
    { key: "views", value: current.totalViews, previous: previous.totalViews },
    {
      key: "searches",
      value: current.searchAppearances,
      previous: previous.searchAppearances,
    },
    {
      key: "contacts",
      value: current.contactActions,
      previous: previous.contactActions,
    },
    {
      key: "enquiries",
      value: current.enquiries,
      previous: previous.enquiries,
    },
  ];
}

/** Narrows a stored status to the states the hub knows how to describe. */
export function toOwnerHubStatus(
  status: string | null | undefined,
): OwnerHubStatus {
  switch (status) {
    case "pending_review":
    case "published":
    case "rejected":
    case "suspended":
      return status;
    default:
      return "draft";
  }
}

/** The real route (and section anchor) behind each step target. */
export function ownerHubHref(
  businessId: string,
  target: OwnerHubTarget,
): string {
  const base = `/dashboard/business/${businessId}`;
  switch (target) {
    case "profile":
      return `${base}/profile`;
    case "website":
      return `${base}/website`;
    case "preview":
      return `${base}/preview`;
    case "media":
      return `${base}/photos`;
    case "publish":
      return `${base}#publish-heading`;
    case "operations":
      return `${base}/operations`;
    case "inbox":
      return `${base}/inbox`;
    case "corrections":
      return `${base}/corrections`;
    case "contacts":
    case "offers":
    case "events":
    case "lifecycle":
      return `${base}/operations#${target}`;
  }
}

/**
 * Enquiries hold residents' personal details, so only members who can open
 * the inbox are told how many are waiting. Everyone else sees none.
 */
export function withEnquiryVisibility<
  T extends Pick<OwnerHubFacts, "enquiriesWaiting" | "oldestEnquiryWaitDays">,
>(facts: T, canManageEnquiries: boolean): T {
  return canManageEnquiries
    ? facts
    : { ...facts, enquiriesWaiting: 0, oldestEnquiryWaitDays: 0 };
}
