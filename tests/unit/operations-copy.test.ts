import { describe, expect, it } from "vitest";
import { cy } from "@/lib/i18n/messages/cy";
import { en } from "@/lib/i18n/messages/en";
import {
  businessCapabilities,
  freeBusinessLimits,
} from "@/modules/businesses/entitlements";
import {
  contactMethodTypes,
  enquiryStatuses,
} from "@/modules/businesses/contacts-and-enquiries";
import { categorySectionTypes } from "@/modules/businesses/content-features";

/**
 * The operations page builds some message keys from domain values (an enquiry
 * status, a capability, a section type). These tests make a new domain value
 * without a message fail here, instead of showing a raw key to an owner.
 */
function expectTranslated(keys: string[]) {
  for (const key of keys) {
    expect(en, key).toHaveProperty([key]);
    expect(cy, key).toHaveProperty([key]);
  }
}

describe("operations page copy", () => {
  it("covers every enquiry status and kind", () => {
    expectTranslated([
      ...enquiryStatuses.map((status) => `ops.enquiry.status.${status}`),
      ...["enquiry", "quote", "callback"].map(
        (kind) => `ops.enquiry.kind.${kind}`,
      ),
    ]);
  });

  it("covers every contact method type and category section type", () => {
    expectTranslated([
      ...contactMethodTypes.map((type) => `ops.contacts.type.${type}`),
      ...categorySectionTypes.map((type) => `ops.sections.type.${type}`),
    ]);
  });

  it("covers every free-plan capability and limit", () => {
    expectTranslated([
      "ops.entitlement.plan.free",
      "ops.entitlement.plan.custom",
      ...businessCapabilities.map(
        (name) => `ops.entitlement.capability.${name}`,
      ),
      ...Object.keys(freeBusinessLimits).map(
        (name) => `ops.entitlement.limit.${name}`,
      ),
    ]);
  });

  it("covers every eligibility check the service can report", () => {
    expectTranslated(
      [
        "business",
        "non-demo business",
        "eligible draft status",
        "verified owner email",
        "accepted terms",
        "working contact action",
        "resolved high-risk conflict",
        "automated checks temporarily unavailable",
      ].map((item) => `ops.life.missing.${item.replaceAll(" ", "_")}`),
    );
  });

  it("covers every lifecycle state, lifecycle action and analytics channel", () => {
    expectTranslated([
      ...[
        "active",
        "paused",
        "temporarily_closed",
        "permanently_closed",
        "deletion_pending",
      ].map((state) => `ops.life.state.${state}`),
      ...[
        "pause",
        "resume",
        "temporary_close",
        "permanent_close",
        "request_deletion",
        "cancel_deletion",
      ].map((action) => `ops.life.action.${action}`),
      ...[
        "call_click",
        "email_click",
        "directions_click",
        "external_click",
        "booking_click",
        "order_click",
      ].map((type) => `ops.analytics.channel.${type}`),
    ]);
  });
});
