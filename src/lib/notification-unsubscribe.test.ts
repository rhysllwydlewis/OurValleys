import { describe, expect, it } from "vitest";
import {
  buildUnsubscribeUrl,
  createUnsubscribeToken,
  isNotificationCategory,
  isValidSubjectId,
  notificationCategories,
  parseBusinessLifecycleSubject,
  verifyUnsubscribeToken,
} from "./notification-unsubscribe";

const subjectId = "00000000-0000-4000-8000-000000009001";
const businessId = "00000000-0000-4000-8000-000000009003";
const ownerId = "00000000-0000-4000-8000-000000009004";

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

describe("parseBusinessLifecycleSubject", () => {
  it("parses a well-formed businessId.ownerId subject", () => {
    expect(parseBusinessLifecycleSubject(`${businessId}.${ownerId}`)).toEqual({
      businessId,
      ownerId,
    });
  });

  it("rejects a bare id with no owner scope", () => {
    expect(parseBusinessLifecycleSubject(businessId)).toBeNull();
  });

  it("rejects a subject with a non-UUID segment", () => {
    expect(
      parseBusinessLifecycleSubject(`${businessId}.not-a-uuid`),
    ).toBeNull();
    expect(parseBusinessLifecycleSubject(`not-a-uuid.${ownerId}`)).toBeNull();
  });
});

describe("isValidSubjectId", () => {
  it("requires a bare UUID for saved_event_cancellation", () => {
    expect(isValidSubjectId("saved_event_cancellation", subjectId)).toBe(true);
    expect(
      isValidSubjectId("saved_event_cancellation", `${businessId}.${ownerId}`),
    ).toBe(false);
  });

  it("requires an owner-scoped composite for business_lifecycle", () => {
    expect(
      isValidSubjectId("business_lifecycle", `${businessId}.${ownerId}`),
    ).toBe(true);
    expect(isValidSubjectId("business_lifecycle", businessId)).toBe(false);
  });
});
