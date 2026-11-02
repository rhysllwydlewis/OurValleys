import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/messages/en";
import { cy } from "@/lib/i18n/messages/cy";
import {
  cleanParams,
  describeNotification,
  kindsInGroup,
  NOTIFICATION_KIND_DETAILS,
  NOTIFICATION_KINDS,
  parseNotificationGroup,
  parsePage,
  safeNotificationHref,
  totalPages,
  unreadBadge,
} from "./notification-model";

describe("notification model", () => {
  it("accepts only site-relative links", () => {
    expect(safeNotificationHref("/events/1")).toBe("/events/1");
    expect(safeNotificationHref("//evil.example")).toBeNull();
    expect(safeNotificationHref("https://evil.example")).toBeNull();
    expect(safeNotificationHref("javascript:alert(1)")).toBeNull();
    expect(safeNotificationHref("/a\\b")).toBeNull();
    expect(safeNotificationHref("/a\nb")).toBeNull();
    expect(safeNotificationHref("/" + "a".repeat(400))).toBeNull();
    expect(safeNotificationHref(null)).toBeNull();
  });

  it("cleans parameters of markup, control characters and length", () => {
    const clean = cleanParams({
      query: "  <b>bakery</b>\n\tshop  ",
      count: 3.9,
      long: "x".repeat(500),
      "bad key!": "dropped",
      nan: Number.NaN,
    });
    expect(clean.query).toBe("b bakery /b shop");
    expect(clean.count).toBe(3);
    expect(String(clean.long)).toHaveLength(120);
    expect(clean).not.toHaveProperty("bad key!");
    expect(clean.nan).toBe(0);
  });

  it("uses the singular title for exactly one", () => {
    expect(
      describeNotification("saved_search_results", { count: 1 }).title,
    ).toBe("notif.kind.search.titleOne");
    expect(
      describeNotification("saved_search_results", { count: 4 }).title,
    ).toBe("notif.kind.search.title");
    expect(describeNotification("event_reminder", { count: 1 }).title).toBe(
      "notif.kind.event.title",
    );
  });

  it("parses groups and pages defensively", () => {
    expect(parseNotificationGroup("saved")).toBe("saved");
    expect(parseNotificationGroup("nonsense")).toBe("all");
    expect(parseNotificationGroup(["business", "saved"])).toBe("business");
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("99999")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it("splits kinds across the two groups with none left out", () => {
    const saved = kindsInGroup("saved");
    const business = kindsInGroup("business");
    expect(business).toEqual(["owner_digest"]);
    expect([...saved, ...business].sort()).toEqual(
      [...NOTIFICATION_KINDS].sort(),
    );
    expect(kindsInGroup("all")).toHaveLength(NOTIFICATION_KINDS.length);
  });

  it("formats the badge and page counts", () => {
    expect(unreadBadge(0)).toBe("");
    expect(unreadBadge(7)).toBe("7");
    expect(unreadBadge(150)).toBe("99+");
    expect(totalPages(0)).toBe(1);
    expect(totalPages(21)).toBe(2);
  });

  it("has English and Welsh text, with the same placeholders, for every kind", () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const kind of NOTIFICATION_KINDS) {
      const details = NOTIFICATION_KIND_DETAILS[kind];
      for (const key of [details.title, details.titleOne, details.body]) {
        if (!key) continue;
        expect(en[key]).toBeTruthy();
        expect(cy[key]).toBeTruthy();
        expect(placeholders(cy[key])).toEqual(placeholders(en[key]));
      }
    }
  });
});
