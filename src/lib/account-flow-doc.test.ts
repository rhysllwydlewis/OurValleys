import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * docs/123-account-and-business-flow.md says how an account becomes an owner
 * or a claimant and how a business reaches the directory. These checks read
 * the code the page points at, so a rule that stops being true fails here
 * instead of leaving the chart quietly wrong.
 */
const read = (path: string) => readFileSync(path, "utf8");
const doc = read("docs/123-account-and-business-flow.md");

/** The body of one exported function, up to the next top-level export. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}(`);
  expect(start, `${name} should exist`).toBeGreaterThan(-1);
  const next = source.indexOf("\nexport ", start + 10);
  return source.slice(start, next === -1 ? undefined : next);
}

describe("the account and business flow document", () => {
  it("holds a chart and names every step of the journey", () => {
    expect(doc).toContain("```mermaid\nflowchart TD");
    for (const step of [
      "Create an account",
      "Verify your email",
      "Suggest a business",
      "List your business",
      "Claim the listing",
      "Submit for review",
      "Team decision",
    ]) {
      expect(doc, step).toContain(step);
    }
  });

  it("points only at files that exist", () => {
    const paths = [...doc.matchAll(/`(src\/[^`\s]+)`/g)].map(
      (match) => match[1]!,
    );
    expect(paths.length).toBeGreaterThan(8);
    for (const path of paths) {
      expect(existsSync(path), `${path} is named in the document`).toBe(true);
    }
  });
});

describe("the rules the document states", () => {
  it("every sign-up is a plain user, verifies its email, and accepts the terms", () => {
    expect(read("src/lib/database/schema/auth.ts")).toContain(
      'role: text("role").notNull().default("user")',
    );
    const auth = read("src/lib/auth.ts");
    expect(auth).toContain("requireEmailVerification: true");
    expect(auth).toContain("autoSignInAfterVerification: true");
    const form = read("src/components/auth/register-form.tsx");
    expect(form).toMatch(/name="terms"\s+type="checkbox"\s+required/);
  });

  it("suggesting a business needs no account", () => {
    for (const file of ["actions.ts", "page.tsx", "suggestion-form.tsx"]) {
      expect(read(`src/app/suggest-a-business/${file}`)).not.toMatch(
        /getSession|redirect\(/,
      );
    }
  });

  it("creating a business needs a verified, non-demonstration account and caps ownership at five", () => {
    const actions = read("src/app/account/new-business/actions.ts");
    expect(actions).toContain("isPublicDemoEmail(session.user.email)");
    expect(actions).toContain("session.user.emailVerified");
    const creation = read("src/modules/businesses/creation.ts");
    expect(creation).toContain("export const maxOwnedBusinesses = 5;");
    expect(creation).toMatch(/role: "owner"/);
    expect(creation).toMatch(/status: "draft"/);
  });

  it("claiming needs a verified, non-demonstration account and goes through the claim guard", () => {
    const actions = read("src/app/claim/[businessId]/actions.ts");
    expect(actions).toContain("isPublicDemoEmail(session.user.email)");
    expect(actions).toContain("session.user.emailVerified");
    expect(actions).toContain("submitBusinessClaim");
    const guard = functionBody(
      read("src/modules/businesses/tickets.ts"),
      "submitBusinessClaim",
    );
    expect(guard).toContain('target.status !== "published"');
    expect(guard).toContain('eq(businessTicket.status, "open")');
  });

  it("an administrator, not the claimant, decides a claim", () => {
    const body = functionBody(
      read("src/modules/businesses/tickets.ts"),
      "resolveBusinessTicket",
    );
    for (const action of [
      "approve_claim",
      "add_manager",
      "transfer_control",
      "request_information",
      "reject",
      "dismiss",
    ]) {
      expect(body, action).toContain(`"${action}"`);
    }
  });

  it("submitting for review needs the publish permission and all four steps", () => {
    const body = functionBody(
      read("src/modules/businesses/publication.ts"),
      "submitBusinessForReview",
    );
    expect(body).toContain("businessPermissions.publish");
    expect(body).toContain('businessRow.status !== "draft"');
    expect(body).toContain('businessRow.status !== "rejected"');
    expect(read("src/modules/businesses/publication.ts")).toContain(
      '"profile",\n  "location",\n  "services",\n  "hours",',
    );
  });

  it("the draft cannot change while it is being reviewed", () => {
    const source = read(
      "src/modules/businesses/onboarding-draft-repository.ts",
    );
    expect(source).toMatch(
      /businessRow\.status === "pending_review"\) \{\s+return \{ status: "locked" \}/,
    );
  });

  it("only an administrator approves or rejects, and approval is audited", () => {
    const source = read("src/app/admin/businesses/[businessId]/actions.ts");
    for (const action of ["approveAction", "rejectAction"]) {
      const body = functionBody(source, action);
      expect(body.indexOf("readAdminSession()")).toBeGreaterThan(-1);
      expect(body.indexOf("readAdminSession()")).toBeLessThan(
        body.search(/(approve|reject)BusinessPublication\(/),
      );
    }
    expect(functionBody(source, "approveAction")).toContain(
      "business.publication_approved",
    );
    const publication = read("src/modules/businesses/publication.ts");
    expect(publication).toContain('publicationRow.status !== "pending_review"');
  });
});
