import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DISPLAY_COOKIE,
  DISPLAY_COOKIE_MAX_AGE,
} from "@/lib/display/preferences";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_UI_COOKIE,
} from "@/lib/i18n/config";
import { privacyPolicySections } from "@/lib/privacy-policy";
import {
  businessActivityTypes,
  type BusinessActivityType,
} from "@/modules/businesses/analytics";
import {
  ENQUIRY_CLOSED_RETENTION_DAYS,
  ENQUIRY_DEFAULT_RETENTION_MONTHS,
  ENQUIRY_SPAM_RETENTION_DAYS,
} from "@/modules/businesses/contacts-and-enquiries";
import { deletionRecoveryDays } from "@/modules/businesses/lifecycle-automation";
import { EDITORIAL_VIEW_RETENTION_DAYS } from "@/modules/platform/editorial-insights-model";
import {
  ACTIVITY_EVENT_RETENTION_MONTHS,
  BUSINESS_SUGGESTION_RETENTION_MONTHS,
  EMAIL_DELIVERY_LOG_RETENTION_DAYS,
  EXPIRED_SESSION_GRACE_DAYS,
  EXPIRED_VERIFICATION_GRACE_DAYS,
  ZERO_RESULT_SEARCH_RETENTION_DAYS,
} from "@/modules/platform/data-retention";
import { READ_NOTIFICATION_RETENTION_DAYS } from "@/modules/residents/notification-model";

const section = (heading: string): string => {
  const found = privacyPolicySections.find(([title]) => title === heading);
  if (!found) throw new Error(`No "${heading}" section.`);
  return found[1];
};

const source = (path: string): string =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("privacy policy wording", () => {
  it("has a unique heading and a body for every section", () => {
    const headings = privacyPolicySections.map(([title]) => title);
    expect(new Set(headings).size).toBe(headings.length);
    for (const [, body] of privacyPolicySections) {
      expect(body.trim().length).toBeGreaterThan(40);
    }
  });

  it("states the retention periods the application actually applies", () => {
    const keep = section("How long we keep it");

    expect(keep).toContain(
      `removed ${EXPIRED_SESSION_GRACE_DAYS} days after they expire`,
    );
    expect(keep).toContain(
      `email-verification records after ${EXPIRED_VERIFICATION_GRACE_DAYS} days`,
    );
    // An open enquiry runs from when it was sent; a closed or archived one
    // restarts from the day it was closed (`computeEnquiryRetentionExpiry`),
    // so the text must say both.
    expect(keep).toContain(
      `up to ${ENQUIRY_DEFAULT_RETENTION_MONTHS} months after it was sent`,
    );
    expect(ENQUIRY_CLOSED_RETENTION_DAYS).toBe(365);
    expect(keep).toContain(
      "closes or archives it, it is kept for 12 months from that date",
    );
    expect(keep).toContain("beyond 24 months");
    expect(keep).toContain(
      `Spam is kept for ${ENQUIRY_SPAM_RETENTION_DAYS} days`,
    );
    expect(keep).toContain(
      `removed after ${READ_NOTIFICATION_RETENTION_DAYS} days`,
    );
    expect(keep).toContain(
      `delivered after ${EMAIL_DELIVERY_LOG_RETENTION_DAYS} days`,
    );
    expect(keep).toContain(
      `found nothing after ${ZERO_RESULT_SEARCH_RETENTION_DAYS} days`,
    );
    expect(keep).toContain(`up to ${ACTIVITY_EVENT_RETENTION_MONTHS} months`);
    expect(keep).toContain(`${EDITORIAL_VIEW_RETENTION_DAYS} days`);
    expect(keep).toContain(
      `deleted after ${BUSINESS_SUGGESTION_RETENTION_MONTHS} months`,
    );
    expect(keep).toContain(
      `removed ${deletionRecoveryDays} days after the request`,
    );
  });

  it("covers every kind of visitor activity the application records", () => {
    const visits = section("Visits and searches");
    // One phrase per group of `businessActivityTypes`; a new type must be
    // placed in a group (or get a new phrase) before this test passes.
    const covered: Record<BusinessActivityType, string> = {
      website_view: "website is viewed",
      search_appearance: "appears in search results",
      call_click: "telephone",
      email_click: "email",
      enquiry: "sends it an enquiry",
      directions_click: "directions",
      external_click: "other links",
      booking_click: "booking",
      order_click: "order",
      qr_visit: "website is viewed",
    };
    expect(Object.keys(covered).sort()).toEqual(
      [...businessActivityTypes].sort(),
    );
    for (const phrase of new Set(Object.values(covered))) {
      expect(visits, phrase).toContain(phrase);
    }
  });

  it("agrees with the suggestions section, which has its own wording", () => {
    expect(section("Business suggestions")).toContain("after twelve months");
    expect(BUSINESS_SUGGESTION_RETENTION_MONTHS).toBe(12);
  });

  it("names every cookie and storage key the site sets, with their lifetime", () => {
    const cookies = section("Cookies and similar storage");

    for (const name of [LOCALE_COOKIE, LOCALE_UI_COOKIE, DISPLAY_COOKIE]) {
      expect(cookies, name).toContain(name);
    }
    // "each lasts up to a year"
    expect(LOCALE_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
    expect(DISPLAY_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
    expect(cookies).toContain("up to a year");

    expect(source("src/components/search/recent-searches.tsx")).toContain(
      '"ov-recent-searches"',
    );
    expect(cookies).toContain("ov-recent-searches");
    expect(source("src/components/navigation-source.tsx")).toContain(
      '"ov-nav-from"',
    );
    expect(cookies).toContain("ov-nav-from");
  });

  it("discloses what the email provider is told, as the code sends it", () => {
    const email = section("Email");
    const sender = source("src/lib/email.ts");

    expect(email).toContain("Postmark");
    // If either of these changes, the policy sentence must change with it.
    expect(sender).toContain("const POSTMARK_TRACK_OPENS = true;");
    expect(sender).toContain('const POSTMARK_TRACK_LINKS = "None";');
    expect(email).toContain("opened");
    expect(email).toContain("do not track clicks");
  });

  it("names the service providers and where the service runs", () => {
    const providers = section("Who handles your data");

    for (const name of ["Railway", "Postmark", "Cloudflare"]) {
      expect(providers).toContain(name);
    }
    expect(providers).toContain("United States");
    // Uploaded files live in Railway's bucket; Cloudflare only caches them.
    expect(providers).toContain("pictures and documents businesses upload");
    expect(providers).not.toContain("holds the pictures");
  });

  it("says no location leaves the browser, and no server route takes one", () => {
    expect(section("Your location")).toContain("not sent to us");
    for (const path of [
      "src/components/directory/near-me-button.tsx",
      "src/components/home/near-you.tsx",
      "src/components/valleys-map/valleys-map.tsx",
    ]) {
      // Coordinates are used only to pick a place locally, never posted.
      expect(source(path), path).not.toMatch(/fetch\(|sendBeacon\(/);
    }
  });
});
