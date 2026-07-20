import { describe, expect, it } from "vitest";
import {
  deriveCompletedOnboardingSteps,
  saveBusinessOnboardingDraft,
  type BusinessOnboardingDraft,
} from "@/modules/businesses/onboarding-draft";

const businessId = "11111111-1111-4111-8111-111111111111";
const otherBusinessId = "22222222-2222-4222-8222-222222222222";

function emptyDraft(): BusinessOnboardingDraft {
  return {
    businessId,
    version: 0,
    profile: null,
    location: null,
    updatedAt: new Date("2026-07-20T06:00:00.000Z"),
  };
}

const validProfile = {
  tradingName: "Cwm Valley Cycles",
  summary: "Independent cycle repairs and servicing for riders across RCT.",
  publicPhone: " 01443 000000 ",
  publicEmail: "HELLO@EXAMPLE.COM",
};

const validLocation = {
  placeId: "33333333-3333-4333-8333-333333333333",
  locationType: "premises",
  publicAddressVisibility: "locality_only",
  publicAddressLineOne: "",
  publicLocality: "Pontypridd",
  publicPostcode: "",
  privateAddressLineOne: "1 Fictional Street",
  privatePostcode: "CF37 1AA",
};

describe("business onboarding draft", () => {
  it("normalises and saves a valid profile with optimistic versioning", () => {
    const savedAt = new Date("2026-07-20T06:15:00.000Z");
    const result = saveBusinessOnboardingDraft(
      emptyDraft(),
      { businessId, expectedVersion: 0, profile: validProfile },
      savedAt,
    );

    expect(result.status).toBe("saved");
    if (result.status !== "saved") return;

    expect(result.draft.version).toBe(1);
    expect(result.draft.updatedAt).toEqual(savedAt);
    expect(result.draft.profile).toMatchObject({
      tradingName: "Cwm Valley Cycles",
      publicPhone: "01443 000000",
      publicEmail: "hello@example.com",
    });
    expect(deriveCompletedOnboardingSteps(result.draft)).toEqual(["profile"]);
  });

  it("saves a valid location without exposing a private address", () => {
    const result = saveBusinessOnboardingDraft(emptyDraft(), {
      businessId,
      expectedVersion: 0,
      location: validLocation,
    });

    expect(result.status).toBe("saved");
    if (result.status !== "saved") return;

    expect(result.draft.location?.publicAddressLineOne).toBeNull();
    expect(result.draft.location?.privateAddressLineOne).toBe(
      "1 Fictional Street",
    );
    expect(deriveCompletedOnboardingSteps(result.draft)).toEqual(["location"]);
  });

  it("rejects invalid profile and unsafe full-address drafts", () => {
    const result = saveBusinessOnboardingDraft(emptyDraft(), {
      businessId,
      expectedVersion: 0,
      profile: { ...validProfile, summary: "Too short" },
      location: {
        ...validLocation,
        publicAddressVisibility: "full_address",
        publicAddressLineOne: "",
        publicPostcode: "",
      },
    });

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["summary", "publicAddressVisibility"]),
    );
  });

  it("returns a conflict for a stale autosave", () => {
    const current = { ...emptyDraft(), version: 4 };
    expect(
      saveBusinessOnboardingDraft(current, {
        businessId,
        expectedVersion: 3,
        profile: validProfile,
      }),
    ).toEqual({ status: "conflict", currentVersion: 4 });
  });

  it("fails closed when the patch targets another business", () => {
    const result = saveBusinessOnboardingDraft(emptyDraft(), {
      businessId: otherBusinessId,
      expectedVersion: 0,
      profile: validProfile,
    });

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.issues[0]?.path).toEqual(["businessId"]);
  });

  it("keeps incomplete drafts out of checklist completion", () => {
    expect(deriveCompletedOnboardingSteps(emptyDraft())).toEqual([]);
  });
});
