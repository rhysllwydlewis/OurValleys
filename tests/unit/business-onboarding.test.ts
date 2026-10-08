import { describe, expect, it } from "vitest";
import {
  businessOnboardingSteps,
  calculateBusinessOnboardingProgress,
  describePreviewStep,
} from "../../src/modules/businesses/onboarding";

describe("calculateBusinessOnboardingProgress", () => {
  it("returns an empty onboarding state", () => {
    expect(calculateBusinessOnboardingProgress([])).toEqual({
      completed: [],
      remaining: businessOnboardingSteps.map((step) => step.key),
      completedCount: 0,
      totalCount: 7,
      percentage: 0,
    });
  });

  it("preserves canonical order for partial progress", () => {
    expect(
      calculateBusinessOnboardingProgress(["services", "profile"]),
    ).toMatchObject({
      completed: ["profile", "services"],
      remaining: ["location", "hours", "attributes", "preview", "publish"],
      completedCount: 2,
      percentage: 29,
    });
  });

  it("caps complete progress at one hundred percent", () => {
    const allKeys = businessOnboardingSteps.map((step) => step.key);

    expect(calculateBusinessOnboardingProgress(allKeys)).toMatchObject({
      completed: allKeys,
      remaining: [],
      completedCount: 7,
      percentage: 100,
    });
  });

  it("ignores duplicate and unknown step keys", () => {
    expect(
      calculateBusinessOnboardingProgress([
        "profile",
        "profile",
        "not-a-step",
        "publish",
      ]),
    ).toMatchObject({
      completed: ["profile", "publish"],
      completedCount: 2,
      totalCount: 7,
      percentage: 29,
    });
  });
});

describe("describePreviewStep", () => {
  it("waits for both the profile and the location", () => {
    for (const completed of [[], ["profile"], ["location"], ["services"]]) {
      expect(describePreviewStep(completed)).toMatchObject({
        chip: "planned",
        label: "Needs profile and location",
      });
    }
  });

  it("is ready for a published business even with an unedited draft", () => {
    expect(describePreviewStep([], { published: true })).toMatchObject({
      chip: "todo",
      label: "Ready to preview",
    });
  });

  it("is ready once the profile and location are drafted, never complete", () => {
    expect(describePreviewStep(["location", "profile"])).toMatchObject({
      chip: "todo",
      label: "Ready to preview",
    });
  });
});
