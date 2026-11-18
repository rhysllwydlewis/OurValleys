import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  accessibilitySections,
  advertisingSections,
  contentGuidelinesSections,
  correctionsSections,
  termsSections,
} from "@/lib/policy-documents";
import { privacyPolicySections } from "@/lib/privacy-policy";

const documents = {
  terms: termsSections,
  accessibility: accessibilitySections,
  "content guidelines": contentGuidelinesSections,
  corrections: correctionsSections,
  advertising: advertisingSections,
} as const;

const text = (sections: readonly (readonly [string, string])[]) =>
  sections.map(([heading, body]) => `${heading}\n${body}`).join("\n\n");

const section = (
  sections: readonly (readonly [string, string])[],
  heading: string,
): string => {
  const found = sections.find(([title]) => title === heading);
  if (!found) throw new Error(`No "${heading}" section.`);
  return found[1];
};

const source = (path: string): string =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const exists = (path: string): boolean =>
  existsSync(new URL(`../../${path}`, import.meta.url));

describe("policy documents", () => {
  it("each has a unique heading and a real body for every section", () => {
    for (const [name, sections] of Object.entries(documents)) {
      const headings = sections.map(([title]) => title);
      expect(new Set(headings).size, name).toBe(headings.length);
      for (const [heading, body] of sections) {
        expect(body.trim().length, `${name}: ${heading}`).toBeGreaterThan(40);
      }
    }
  });

  it("send every reader to the same contact route as the privacy policy", () => {
    const route = "contact form on vexi.co.uk";
    expect(text(privacyPolicySections)).toContain(route);
    for (const name of [
      "terms",
      "accessibility",
      "corrections",
      "advertising",
    ] as const) {
      expect(text(documents[name]), name).toContain(route);
    }
    // The site has no mailbox of its own, so none may be named.
    for (const [name, sections] of Object.entries(documents)) {
      expect(text(sections), name).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    }
  });

  it("are dated, so a reader can tell how current they are", () => {
    const date = /18 November 2026/;
    expect(section(termsSections, "Changes to these terms")).toMatch(date);
    expect(section(accessibilitySections, "If you are not satisfied")).toMatch(
      date,
    );
  });
});

describe("terms of use", () => {
  const terms = text(termsSections);

  it("name the operator and the law the way the owner's other terms do", () => {
    expect(terms).toContain("VEXI, a sole trader trading as VEXI");
    expect(section(termsSections, "Governing law")).toContain(
      "England and Wales",
    );
    expect(terms).toContain("Consumer Rights Act 2015");
  });

  it("set the same minimum age as the privacy policy", () => {
    expect(section(termsSections, "Who can use it")).toContain("at least 13");
    expect(
      privacyPolicySections.find(([title]) => title === "Children")?.[1],
    ).toContain("under 13");
  });

  it("describe only what the site does", () => {
    // Accounts accept the terms at registration, with a link to them.
    expect(source("src/components/auth/register-form.tsx")).toContain(
      "/policies/terms",
    );
    // Two-step sign-in, content reports and account deletion exist.
    expect(terms).toContain("two-step sign-in");
    expect(exists("src/components/account/two-factor-panel.tsx")).toBe(true);
    expect(terms).toContain("report control");
    expect(exists("src/app/report/content-report-form.tsx")).toBe(true);
    expect(terms).toContain("delete your account from your privacy page");
    expect(exists("src/app/account/privacy/page.tsx")).toBe(true);
    // A website is built from structured fields: no scripts, no raw HTML.
    expect(terms).toContain("cannot add scripts or unrestricted HTML");
  });

  it("promise no feature the site does not have", () => {
    // No payments code exists, and no marketplace, review or forum is offered.
    expect(exists("src/modules/payments/index.ts")).toBe(false);
    const fees = section(termsSections, "Fees");
    expect(fees).toContain("free to use at the moment");
    expect(fees).toContain("payments and a marketplace are not available");
    // "Review" is fine as a verb (we review a report); a reviews feature is not.
    expect(terms).not.toMatch(
      /\b(customer|public|user|star) reviews?\b|\bratings?\b/i,
    );
    expect(terms).not.toMatch(/\bforum\b/i);
  });

  it("keep liability the law protects, and cap it only for business use", () => {
    const liability = section(termsSections, "Our responsibility to you");
    expect(liability).toContain(
      "death or personal injury caused by negligence",
    );
    expect(liability).toContain("fraud");
    expect(liability).toContain("Your legal rights as a consumer");
    expect(liability).toContain("If you use OurValleys for business purposes");
    expect(liability).toContain("limited to £100");
  });
});

describe("accessibility statement", () => {
  const statement = text(accessibilitySections);

  it("states its standard and says plainly that there has been no audit", () => {
    expect(statement).toContain("WCAG");
    expect(statement).toContain("2.2");
    expect(statement).toContain(
      "have not yet had an independent accessibility audit",
    );
  });

  it("claims only what the code and the test suite show", () => {
    // Automated accessibility checks (axe) run in the browser tests.
    expect(source("tests/e2e/account-extra-sections.spec.ts")).toContain(
      "AxeBuilder",
    );
    expect(statement).toContain("Automated accessibility checks");
    // Reduced motion is honoured, and display settings exist.
    expect(source("src/app/globals.css")).toMatch(/prefers-reduced-motion/);
    expect(statement).toContain("reduced-motion");
    expect(exists("src/app/display/page.tsx")).toBe(true);
    expect(statement).toContain("display settings");
    // The map is keyboard-tested, and its places are also listed in text.
    expect(source("tests/e2e/valleys-map.spec.ts")).toMatch(/keyboard/i);
    expect(statement).toContain("can be used with a keyboard");
  });
});

describe("advertising policy", () => {
  it("says no placement is sold, and that is true while no payment code exists", () => {
    expect(exists("src/modules/payments/index.ts")).toBe(false);
    expect(section(advertisingSections, "Where things stand")).toContain(
      "does not take payment for placement",
    );
  });

  it("keeps verification separate from payment", () => {
    expect(section(advertisingSections, "Paid is not verified")).toContain(
      "Payment never earns a verified label",
    );
    expect(
      section(termsSections, "Business listings and website tools"),
    ).toContain("paying for anything never buys it");
  });
});

describe("policy page", () => {
  it("serves every document", () => {
    const page = source("src/app/policies/[policy]/page.tsx");
    for (const name of [
      "termsSections",
      "accessibilitySections",
      "contentGuidelinesSections",
      "correctionsSections",
      "advertisingSections",
    ]) {
      expect(page, name).toContain(name);
    }
  });
});
