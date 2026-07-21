import { describe, expect, it } from "vitest";
import { getPublicationGuidance } from "@/modules/businesses/publication-guidance";

describe("publication lifecycle guidance", () => {
  it("keeps draft submission private and reversible", () => {
    const guidance = getPublicationGuidance("draft");

    expect(guidance.canSubmit).toBe(true);
    expect(guidance.visibility).toContain("authorised business members");
    expect(guidance.rollback).toContain("does not publish anything");
  });

  it("explains that review does not replace the public version", () => {
    const guidance = getPublicationGuidance("pending_review");

    expect(guidance.canSubmit).toBe(false);
    expect(guidance.visibility).toContain("public site stays unchanged");
    expect(guidance.rollback).toContain("no public change to roll back");
  });

  it("preserves the approved version and does not promise an unavailable resubmission path", () => {
    const guidance = getPublicationGuidance("published");

    expect(guidance.chip).toBe("complete");
    expect(guidance.canSubmit).toBe(false);
    expect(guidance.visibility).toContain(
      "Later draft edits do not replace it",
    );
    expect(guidance.nextAction).toContain(
      "Submitting a replacement revision is not available yet",
    );
    expect(guidance.nextAction).toContain("contact the platform team");
    expect(guidance.rollback).toContain(
      "currently approved version remains live",
    );
  });

  it("makes moderation feedback and resubmission the rejected next step", () => {
    const guidance = getPublicationGuidance("rejected");

    expect(guidance.canSubmit).toBe(true);
    expect(guidance.nextAction).toContain("reviewer note");
    expect(guidance.rollback).toContain("never went live");
  });

  it("makes suspended visibility and reinstatement explicit", () => {
    const guidance = getPublicationGuidance("suspended");

    expect(guidance.canSubmit).toBe(false);
    expect(guidance.visibility).toContain("cannot access");
    expect(guidance.rollback).toContain("administrator-controlled");
  });

  it("falls back safely for an unknown stored status", () => {
    expect(getPublicationGuidance("unexpected")).toEqual(
      getPublicationGuidance("draft"),
    );
  });
});
