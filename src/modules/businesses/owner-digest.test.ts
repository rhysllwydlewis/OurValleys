import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { composeOwnerDigestEmail, isOwnerDigestEmpty } from "./owner-digest";

const base = {
  periodDays: 7,
  views: 0,
  contactActions: 0,
  enquiries: 0,
  awaitingReply: 0,
};

describe("isOwnerDigestEmpty", () => {
  it("is empty only when there is no activity and nothing waiting", () => {
    expect(isOwnerDigestEmpty(base)).toBe(true);
    expect(isOwnerDigestEmpty({ ...base, views: 1 })).toBe(false);
    expect(isOwnerDigestEmpty({ ...base, contactActions: 1 })).toBe(false);
    expect(isOwnerDigestEmpty({ ...base, enquiries: 1 })).toBe(false);
    expect(isOwnerDigestEmpty({ ...base, awaitingReply: 2 })).toBe(false);
  });
});

describe("composeOwnerDigestEmail", () => {
  const siteUrl = new URL("https://example.test");

  it("reports counts, links the dashboard and carries the unsubscribe link", () => {
    const message = composeOwnerDigestEmail({
      businessId: "b1",
      businessName: "Fixture Bakery",
      content: { ...base, views: 12, contactActions: 3, enquiries: 1 },
      unsubscribeUrl: "https://example.test/unsubscribe/x",
      siteUrl,
    });
    expect(message.subject).toBe("Your weekly summary for Fixture Bakery");
    expect(message.text).toContain("Page views: 12");
    expect(message.text).toContain("contact taps: 3");
    expect(message.text).toContain("New enquiries: 1");
    expect(message.text).toContain(
      "https://example.test/dashboard/business/b1/insights",
    );
    expect(message.text).toContain(
      "Stop these emails: https://example.test/unsubscribe/x",
    );
    expect(message.text).not.toContain("waiting for a reply");
  });

  it("flags enquiries waiting for a reply", () => {
    const one = composeOwnerDigestEmail({
      businessId: "b1",
      businessName: "Fixture Bakery",
      content: { ...base, awaitingReply: 1 },
      unsubscribeUrl: "https://example.test/u",
      siteUrl,
    });
    expect(one.text).toContain("1 enquiry is still waiting for a reply.");
    expect(one.text).toContain("/dashboard/business/b1/operations/enquiries");
    const many = composeOwnerDigestEmail({
      businessId: "b1",
      businessName: "Fixture Bakery",
      content: { ...base, awaitingReply: 3 },
      unsubscribeUrl: "https://example.test/u",
      siteUrl,
    });
    expect(many.text).toContain("3 enquiries are still waiting for a reply.");
  });
});
