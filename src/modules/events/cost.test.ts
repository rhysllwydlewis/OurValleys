import { describe, expect, it } from "vitest";
import { eventCostSummary, eventCostTags } from "./cost";

const words = {
  free: "Free",
  paid: "Paid",
  stepFree: "Step-free access",
  notStepFree: "Not step-free",
};

describe("eventCostTags", () => {
  it("says nothing when the organiser said nothing", () => {
    expect(eventCostTags({})).toEqual([]);
    expect(
      eventCostTags({ isFree: null, priceNote: null, stepFree: null }),
    ).toEqual([]);
    expect(eventCostTags({ priceNote: "   " })).toEqual([]);
  });

  it("labels free, paid with a note, and access", () => {
    expect(eventCostTags({ isFree: true, stepFree: true })).toEqual([
      { kind: "free" },
      { kind: "stepFree" },
    ]);
    expect(
      eventCostTags({
        isFree: false,
        priceNote: " £5 on the door ",
        stepFree: false,
      }),
    ).toEqual([
      { kind: "paid", note: "£5 on the door" },
      { kind: "notStepFree" },
    ]);
    expect(eventCostTags({ isFree: false })).toEqual([
      { kind: "paid", note: null },
    ]);
  });

  it("never shows a price note beside Free", () => {
    const tags = eventCostTags({ isFree: true, priceNote: "£5" });
    expect(tags).toEqual([{ kind: "free" }]);
  });

  it("shows a lone price note", () => {
    expect(eventCostTags({ priceNote: "Donations welcome" })).toEqual([
      { kind: "paid", note: "Donations welcome" },
    ]);
  });
});

describe("eventCostSummary", () => {
  it("joins the tags into one line, or null", () => {
    expect(eventCostSummary({}, words)).toBeNull();
    expect(eventCostSummary({ isFree: true, stepFree: true }, words)).toBe(
      "Free · Step-free access",
    );
    expect(eventCostSummary({ isFree: false }, words)).toBe("Paid");
  });
});
