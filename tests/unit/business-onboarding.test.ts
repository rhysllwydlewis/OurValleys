import { describe, expect, it } from "vitest";
import {
  businessOnboardingSteps,
  calculateBusinessOnboardingProgress,
} from "../../src/modules/businesses/onboarding";

describe("calculateBusinessOnboardingProgress", () => {
  it("returns an empty onboarding state", () => {
    expect(calculateBusinessOnboardingProgress([])).toEqual({
      completed: [],
      remaining: businessOnboardingSteps.map((step) => step.key),
      completedCount: 0,
      totalCount: 6,
      percentage: 0,
    });
  });

  it("preserves canonical order for partial progress", () => {
    expect(
      calculateBusinessOnboardingProgress(["services", "profile"]),
    ).toMatchObject({
      completed: ["profile", "services"],
      remaining: ["location", "hours", "preview", "publish"],
      completedCount: 2,
      percentage: 33,
    });
  });

  it("caps complete progress at one hundred percent", () => {
    const allKeys = businessOnboardingSteps.map((step) => step.key);

    expect(calculateBusinessOnboardingProgress(allKeys)).toMatchObject({
      completed: allKeys,
      remaining: [],
      completedCount: 6,
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
      totalCount: 6,
      percentage: 33,
    });
  });
});
