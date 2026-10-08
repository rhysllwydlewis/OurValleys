import { describe, expect, it } from "vitest";
import { normaliseOfferAction } from "@/modules/businesses/offer-form";

describe("normaliseOfferAction", () => {
  it("drops the default label when there is no link, so the offer is valid", () => {
    expect(normaliseOfferAction({ label: "View offer", url: "" })).toEqual({
      actionLabel: null,
      actionUrl: null,
    });
    expect(normaliseOfferAction({ label: "View offer", url: "   " })).toEqual({
      actionLabel: null,
      actionUrl: null,
    });
    expect(normaliseOfferAction({ label: "View offer", url: null })).toEqual({
      actionLabel: null,
      actionUrl: null,
    });
  });

  it("keeps the label and trims the link when there is one", () => {
    expect(
      normaliseOfferAction({
        label: " Claim it ",
        url: " https://example.test/offer ",
      }),
    ).toEqual({
      actionLabel: "Claim it",
      actionUrl: "https://example.test/offer",
    });
  });

  it("allows a link without a label", () => {
    expect(
      normaliseOfferAction({ label: "", url: "https://example.test/o" }),
    ).toEqual({ actionLabel: null, actionUrl: "https://example.test/o" });
  });
});
