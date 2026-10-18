import { describe, expect, it } from "vitest";
import {
  buildOwnerNextSteps,
  hubFigures,
  OWNER_HUB_MAX_STEPS,
  ownerHubHref,
  toOwnerHubStatus,
  withEnquiryVisibility,
  type OwnerHubFacts,
} from "./owner-hub";

const settled: OwnerHubFacts = {
  status: "published",
  canEdit: true,
  canPublish: true,
  canOperate: true,
  canDesign: true,
  setupKnown: true,
  missingSetupSteps: [],
  enquiriesWaiting: 0,
  oldestEnquiryWaitDays: 0,
  contactMethodCount: 2,
  hasLogo: true,
  galleryCount: 3,
  activeOfferCount: 1,
  upcomingEventCount: 1,
  weeklyDigestEnabled: true,
};

const ids = (facts: Partial<OwnerHubFacts>) =>
  buildOwnerNextSteps({ ...settled, ...facts }).map((step) => step.id);

describe("buildOwnerNextSteps", () => {
  it("is empty for a fully set up published business", () => {
    expect(ids({})).toEqual([]);
  });

  it("leads with suspension and stops there for editors", () => {
    expect(ids({ status: "suspended", hasLogo: false })).toEqual(["suspended"]);
  });

  it("does not ask a suspended business to reply to enquiries first", () => {
    expect(ids({ status: "suspended", enquiriesWaiting: 4 })).toEqual([
      "suspended",
    ]);
  });

  it("puts requested changes before enquiries and setup", () => {
    expect(
      ids({
        status: "rejected",
        enquiriesWaiting: 1,
        missingSetupSteps: ["hours"],
      }),
    ).toEqual(["changes_requested", "reply_enquiries", "finish_hours"]);
  });

  it("marks an old enquiry urgent and a fresh one as next", () => {
    const old = buildOwnerNextSteps({
      ...settled,
      enquiriesWaiting: 2,
      oldestEnquiryWaitDays: 5,
    });
    expect(old[0]).toMatchObject({
      id: "reply_enquiries",
      tone: "urgent",
      count: 2,
      days: 5,
    });
    const fresh = buildOwnerNextSteps({
      ...settled,
      enquiriesWaiting: 1,
      oldestEnquiryWaitDays: 1,
    });
    expect(fresh[0]?.tone).toBe("next");
  });

  it("lists missing setup steps in order for a draft, then asks to submit", () => {
    expect(
      ids({
        status: "draft",
        missingSetupSteps: ["location", "hours"],
        contactMethodCount: 0,
      }),
    ).toEqual(["finish_location", "finish_hours", "add_contact"]);
    expect(ids({ status: "draft" })).toEqual(["submit_for_review"]);
  });

  it("only offers submit to someone who can publish", () => {
    expect(ids({ status: "draft", canPublish: false })).toEqual([]);
  });

  it("says a business in review is waiting, without growth prompts that need it live", () => {
    expect(ids({ status: "pending_review", hasLogo: false })).toEqual([
      "in_review",
      "add_logo",
    ]);
  });

  it("offers offers, events and the digest only once live", () => {
    expect(
      ids({
        status: "published",
        activeOfferCount: 0,
        upcomingEventCount: 0,
        weeklyDigestEnabled: false,
      }),
    ).toEqual(["add_offer", "add_event", "turn_on_digest"]);
    expect(
      ids({
        status: "draft",
        activeOfferCount: 0,
        upcomingEventCount: 0,
        weeklyDigestEnabled: false,
      }),
    ).toEqual(["submit_for_review"]);
  });

  it("asks for a logo before photos and never both", () => {
    expect(ids({ hasLogo: false, galleryCount: 0 })).toEqual(["add_logo"]);
    expect(ids({ hasLogo: true, galleryCount: 0 })).toEqual(["add_photos"]);
  });

  it("caps the list", () => {
    const many = buildOwnerNextSteps({
      ...settled,
      status: "published",
      enquiriesWaiting: 3,
      oldestEnquiryWaitDays: 9,
      contactMethodCount: 0,
      hasLogo: false,
      activeOfferCount: 0,
      upcomingEventCount: 0,
      weeklyDigestEnabled: false,
    });
    expect(many).toHaveLength(OWNER_HUB_MAX_STEPS);
    expect(many[0]?.id).toBe("reply_enquiries");
  });

  it("gives a viewer only the enquiry and suspension signals, never edit prompts", () => {
    expect(
      ids({
        canEdit: false,
        canPublish: false,
        status: "draft",
        missingSetupSteps: ["profile"],
        hasLogo: false,
        enquiriesWaiting: 2,
        oldestEnquiryWaitDays: 0,
      }),
    ).toEqual(["reply_enquiries"]);
    expect(ids({ canEdit: false, status: "rejected" })).toEqual([]);
  });
});

describe("steps for members who cannot open the tools", () => {
  const growing = {
    contactMethodCount: 0,
    hasLogo: false,
    activeOfferCount: 0,
    upcomingEventCount: 0,
    weeklyDigestEnabled: false,
  };

  it("never offers a step whose page the member cannot open", () => {
    expect(ids({ ...growing, canOperate: false, canDesign: false })).toEqual(
      [],
    );
  });

  it("offers pictures to designers but not operations steps to non-operators", () => {
    expect(ids({ ...growing, canOperate: false })).toEqual(["add_logo"]);
  });

  it("offers operations steps without pictures to operators who cannot design", () => {
    expect(ids({ ...growing, canDesign: false })).toEqual([
      "add_contact",
      "add_offer",
      "add_event",
      "turn_on_digest",
    ]);
  });

  it("does not tell a non-operator about enquiries, and a suspension has no link", () => {
    expect(ids({ canOperate: false, enquiriesWaiting: 3 })).toEqual([]);
    const [suspended] = buildOwnerNextSteps({
      ...settled,
      status: "suspended",
      canOperate: false,
    });
    expect(suspended).toMatchObject({ id: "suspended", target: null });
  });
});

describe("when the draft could not be read", () => {
  it("gives no setup advice and does not claim the profile is ready", () => {
    expect(ids({ status: "draft", setupKnown: false })).toEqual([]);
    expect(
      ids({ status: "draft", setupKnown: false, missingSetupSteps: ["hours"] }),
    ).toEqual([]);
  });

  it("still reports urgent facts it can know", () => {
    expect(
      ids({ status: "rejected", setupKnown: false, enquiriesWaiting: 1 }),
    ).toEqual(["changes_requested", "reply_enquiries"]);
  });
});

describe("hubFigures", () => {
  it("keeps the order and pairs each figure with its previous value", () => {
    const figures = hubFigures(
      {
        totalViews: 10,
        searchAppearances: 20,
        contactActions: 3,
        enquiries: 1,
      },
      { totalViews: 5, searchAppearances: 0, contactActions: 3, enquiries: 0 },
    );
    expect(figures.map((figure) => figure.key)).toEqual([
      "views",
      "searches",
      "contacts",
      "enquiries",
    ]);
    expect(figures[0]).toEqual({ key: "views", value: 10, previous: 5 });
    expect(figures[1]).toEqual({ key: "searches", value: 20, previous: 0 });
  });
});

describe("toOwnerHubStatus", () => {
  it("accepts known states and treats anything else as a draft", () => {
    expect(toOwnerHubStatus("published")).toBe("published");
    expect(toOwnerHubStatus("pending_review")).toBe("pending_review");
    expect(toOwnerHubStatus("rejected")).toBe("rejected");
    expect(toOwnerHubStatus("suspended")).toBe("suspended");
    expect(toOwnerHubStatus("archived")).toBe("draft");
    expect(toOwnerHubStatus(null)).toBe("draft");
  });
});

describe("ownerHubHref", () => {
  const id = "00000000-0000-4000-8000-000000000401";
  it("points each target at a real dashboard route", () => {
    expect(ownerHubHref(id, "profile")).toBe(
      `/dashboard/business/${id}/profile`,
    );
    expect(ownerHubHref(id, "inbox")).toBe(`/dashboard/business/${id}/inbox`);
    expect(ownerHubHref(id, "media")).toBe(
      `/dashboard/business/${id}/website#media-h`,
    );
    expect(ownerHubHref(id, "publish")).toBe(
      `/dashboard/business/${id}#publish-heading`,
    );
  });
});

describe("withEnquiryVisibility", () => {
  const facts = { ...settled, enquiriesWaiting: 3, oldestEnquiryWaitDays: 4 };

  it("hides the enquiry counts from members who cannot open the inbox", () => {
    const hidden = withEnquiryVisibility(facts, false);
    expect(hidden.enquiriesWaiting).toBe(0);
    expect(hidden.oldestEnquiryWaitDays).toBe(0);
    expect(buildOwnerNextSteps(hidden).map((step) => step.id)).not.toContain(
      "reply_enquiries",
    );
    // Other facts are untouched.
    expect(hidden.galleryCount).toBe(facts.galleryCount);
  });

  it("keeps them for inbox managers", () => {
    expect(withEnquiryVisibility(facts, true)).toBe(facts);
  });
});
