import { describe, expect, it } from "vitest";
import {
  buildUnsubscribeUrl,
  createUnsubscribeToken,
  isNotificationCategory,
  notificationCategories,
  verifyUnsubscribeToken,
} from "./notification-unsubscribe";

const subjectId = "00000000-0000-4000-8000-000000009001";

describe("isNotificationCategory", () => {
  it("accepts every declared category", () => {
    for (const category of notificationCategories) {
      expect(isNotificationCategory(category)).toBe(true);
    }
  });

  it("rejects an unknown category", () => {
    expect(isNotificationCategory("marketing_digest")).toBe(false);
    expect(isNotificationCategory("")).toBe(false);
  });
});

describe("unsubscribe tokens", () => {
  it("verifies a token created for the same category and subject", () => {
    const token = createUnsubscribeToken("business_lifecycle", subjectId);
    expect(verifyUnsubscribeToken("business_lifecycle", subjectId, token)).toBe(
      true,
    );
  });

  it("is deterministic for the same inputs, so the same link keeps working", () => {
    expect(createUnsubscribeToken("business_lifecycle", subjectId)).toBe(
      createUnsubscribeToken("business_lifecycle", subjectId),
    );
  });

  it("rejects a token generated for a different subject", () => {
    const token = createUnsubscribeToken("business_lifecycle", subjectId);
    const otherSubject = "00000000-0000-4000-8000-000000009002";
    expect(
      verifyUnsubscribeToken("business_lifecycle", otherSubject, token),
    ).toBe(false);
  });

  it("rejects a token generated for a different category", () => {
    const token = createUnsubscribeToken("business_lifecycle", subjectId);
    expect(
      verifyUnsubscribeToken("saved_event_cancellation", subjectId, token),
    ).toBe(false);
  });

  it("rejects a tampered token", () => {
    const token = createUnsubscribeToken("business_lifecycle", subjectId);
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(
      verifyUnsubscribeToken("business_lifecycle", subjectId, tampered),
    ).toBe(false);
  });

  it("rejects a malformed token without matching hex length", () => {
    expect(
      verifyUnsubscribeToken("business_lifecycle", subjectId, "not-a-token"),
    ).toBe(false);
    expect(verifyUnsubscribeToken("business_lifecycle", subjectId, "")).toBe(
      false,
    );
  });

  it("builds an unsubscribe URL embedding the category, subject and a valid token", () => {
    const url = new URL(
      buildUnsubscribeUrl("saved_event_cancellation", subjectId),
    );
    const [, , category, subject, token] = url.pathname.split("/");
    expect(category).toBe("saved_event_cancellation");
    expect(subject).toBe(subjectId);
    expect(
      verifyUnsubscribeToken(
        "saved_event_cancellation",
        subjectId,
        token ?? "",
      ),
    ).toBe(true);
  });
});
