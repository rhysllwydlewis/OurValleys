import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The account pages and the business dashboard pages are for signed-in people.
 *
 * `dashboard/business/[businessId]/layout.tsx` turns the wrong people away, but a
 * layout and the page under it render at the same time. When the layout
 * redirects, whatever the page has already rendered is still sent in the body of
 * the redirect response, so a request with no login could read it. The account
 * area has no layout check at all. Each page therefore has to check for itself,
 * before it reads any data. (The admin pages have the same rule, enforced in
 * `admin/admin-guards.test.ts`.)
 *
 * What a page may do first: wait for the visitor's own input (`params`,
 * `searchParams`), the language and the request headers. None of that is data.
 */

const appDirectory = __dirname;

function pagesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry === "page.tsx" ? [path] : [];
  });
}

const notData = new Set(["getTranslator", "headers", "params", "searchParams"]);
const sessionReads = new Set(["readSession", "getSession"]);

type Rules = {
  /** The page belongs to one business, so being signed in is not enough. */
  needsBusinessAccess: boolean;
};

/**
 * What is wrong with how a page checks access, or null when it is right.
 */
function problemWithAccessCheck(source: string, rules: Rules): string | null {
  const start = source.search(/export default (?:async )?function \w+\(/);
  if (start === -1) return "no default page function";

  const body = source
    .slice(start)
    .replace(/\s+/g, " ")
    // `getAuth().api.getSession(...)` is a session read, whatever it is spelt like.
    .replace(/getAuth\(\)\s*\.api\s*\.getSession\(/g, "getSession(");

  const awaited = [...body.matchAll(/\bawait\s+(\w+)/g)].map((match) => ({
    name: match[1] ?? "",
    at: match.index ?? 0,
  }));

  const session = awaited.find((call) => sessionReads.has(call.name));
  if (!session) return "never reads the session";

  // The first thing that is real data: anything that is not the visitor's own
  // input, the session itself, or the business permission check.
  const data = awaited.find(
    (call) =>
      !notData.has(call.name) &&
      !sessionReads.has(call.name) &&
      call.name !== "canUserAccessBusiness",
  );
  const dataAt = data ? data.at : Number.POSITIVE_INFINITY;

  const signedOut = body
    .slice(session.at)
    .search(/if \(!session\) \{? ?(?:redirect|notFound)\(/);
  if (signedOut === -1) return "does not send a signed-out visitor away";
  if (session.at + signedOut > dataAt) {
    return `reads data (${data?.name}) before sending a signed-out visitor away`;
  }

  if (!rules.needsBusinessAccess) return null;

  const permission = awaited.find(
    (call) => call.name === "canUserAccessBusiness" && call.at > session.at,
  );
  if (!permission) return "never checks access to the business";

  const refused = body
    .slice(permission.at)
    .search(/if \(!\w+\) \{? ?notFound\(\)/);
  if (refused === -1) return "does not refuse a person without business access";
  if (permission.at + refused > dataAt) {
    return `reads data (${data?.name}) before refusing a person without business access`;
  }
  return null;
}

const areas = [
  { name: "account", directory: "account", needsBusinessAccess: false },
  {
    name: "business dashboard",
    directory: join("dashboard", "business"),
    needsBusinessAccess: true,
  },
] as const;

describe.each(areas)(
  "$name pages check access before reading data",
  ({ directory, needsBusinessAccess }) => {
    const pages = pagesUnder(join(appDirectory, directory)).map((path) => ({
      path: path.slice(appDirectory.length + 1),
      source: readFileSync(path, "utf8"),
    }));

    it("finds the pages", () => {
      expect(pages.length).toBeGreaterThanOrEqual(needsBusinessAccess ? 16 : 7);
    });

    it.each(pages.map((page) => [page.path, page.source] as const))(
      "%s",
      (_path, source) => {
        expect(
          problemWithAccessCheck(source, { needsBusinessAccess }),
        ).toBeNull();
      },
    );
  },
);

describe("problemWithAccessCheck", () => {
  const account = { needsBusinessAccess: false };
  const business = { needsBusinessAccess: true };

  const page = (statements: string) =>
    `export default async function P({ params }: X) {\n${statements}\n}`;

  it("accepts a page that sends signed-out visitors away before loading", () => {
    expect(
      problemWithAccessCheck(
        page(`
          const { t } = await getTranslator();
          const session = await readSession();
          if (!session) redirect("/login");
          const rows = await listThings(session.user.id);`),
        account,
      ),
    ).toBeNull();
  });

  it("accepts the session read spelt out in full", () => {
    expect(
      problemWithAccessCheck(
        page(`
          const session = await getAuth()
            .api.getSession({ headers: await headers() })
            .catch(() => null);
          if (!session) {
            redirect("/login");
          }
          const rows = await listThings(session.user.id);`),
        account,
      ),
    ).toBeNull();
  });

  it("notices data read before the session check", () => {
    expect(
      problemWithAccessCheck(
        page(`
          const rows = await listThings();
          const session = await readSession();
          if (!session) redirect("/login");`),
        account,
      ),
    ).toMatch(/reads data \(listThings\) before sending a signed-out/);
    expect(
      problemWithAccessCheck(
        page(`
          const session = await readSession();
          const rows = await listThings();
          if (!session) redirect("/login");`),
        account,
      ),
    ).toMatch(/reads data \(listThings\) before sending a signed-out/);
  });

  it("notices a session that is read but never acted on", () => {
    expect(
      problemWithAccessCheck(
        page(`
          const session = await readSession();
          const rows = await listThings(session?.user.id);`),
        account,
      ),
    ).toBe("does not send a signed-out visitor away");
  });

  it("notices loading alongside the check in Promise.all", () => {
    expect(
      problemWithAccessCheck(
        page(`
          const [session, rows] = await Promise.all([readSession(), listThings()]);
          if (!session) redirect("/login");`),
        account,
      ),
    ).toBe("never reads the session");
  });

  it("requires a business page to refuse people without access first", () => {
    const signedIn = `
      const session = await readSession();
      if (!session) redirect("/login");
      const { businessId } = await params;`;

    expect(
      problemWithAccessCheck(
        page(`${signedIn}
          const canView = await canUserAccessBusiness({ businessId });
          if (!canView) notFound();
          const inbox = await listInbox(businessId);`),
        business,
      ),
    ).toBeNull();

    expect(
      problemWithAccessCheck(
        page(`${signedIn}
          const inbox = await listInbox(businessId);`),
        business,
      ),
    ).toBe("never checks access to the business");

    expect(
      problemWithAccessCheck(
        page(`${signedIn}
          const canView = await canUserAccessBusiness({ businessId });
          const inbox = await listInbox(businessId);
          if (!canView) notFound();`),
        business,
      ),
    ).toMatch(/reads data \(listInbox\) before refusing a person/);

    expect(
      problemWithAccessCheck(
        page(`${signedIn}
          const canView = await canUserAccessBusiness({ businessId });`),
        business,
      ),
    ).toBe("does not refuse a person without business access");
  });
});
