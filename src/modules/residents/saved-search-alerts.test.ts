import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { alertableNewCount } from "./saved-search-model";
import { composeSearchAlertEmail } from "./saved-search-alerts";

const siteUrl = new URL("https://ourvalleys.example");
const unsubscribeUrl = "https://ourvalleys.example/unsubscribe/x";

describe("alertableNewCount", () => {
  it("counts results beyond the last look when nothing was alerted", () => {
    expect(alertableNewCount(7, 4, null)).toBe(3);
  });

  it("does not repeat results an earlier alert already covered", () => {
    expect(alertableNewCount(7, 4, 7)).toBe(0);
    expect(alertableNewCount(9, 4, 7)).toBe(2);
  });

  it("does not announce results the resident has since looked at", () => {
    expect(alertableNewCount(7, 7, 5)).toBe(0);
  });

  it("is never negative", () => {
    expect(alertableNewCount(2, 6, 5)).toBe(0);
  });
});

describe("composeSearchAlertEmail", () => {
  it("names a single search in the subject and links back to it", () => {
    const { subject, text } = composeSearchAlertEmail(
      [
        {
          id: "s1",
          query: "bakery",
          href: "/search?q=bakery",
          newCount: 1,
          total: 5,
          previousTotal: 0,
        },
      ],
      unsubscribeUrl,
      siteUrl,
    );
    expect(subject).toBe('New results for "bakery"');
    expect(text).toContain("1 new result (5 in total)");
    expect(text).toContain("https://ourvalleys.example/search?q=bakery");
    expect(text).toContain(unsubscribeUrl);
  });

  it("counts searches in the subject when there are several", () => {
    const { subject, text } = composeSearchAlertEmail(
      [
        {
          id: "a",
          query: "cafe",
          href: "/search?q=cafe",
          newCount: 2,
          total: 8,
          previousTotal: 0,
        },
        {
          id: "b",
          query: "yoga",
          href: "/search?q=yoga",
          newCount: 1,
          total: 3,
          previousTotal: 0,
        },
      ],
      unsubscribeUrl,
      siteUrl,
    );
    expect(subject).toBe("New results for 2 of your saved searches");
    expect(text).toContain("2 new results");
    expect(text).toContain("yoga");
  });
});
