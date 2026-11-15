import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readAdminSession = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("@/modules/identity/admin-access", () => ({ readAdminSession }));
vi.mock("next/navigation", () => ({ notFound }));

import { requireAdminForPage } from "./require-admin";

const adminDirectory = __dirname;

function adminPages(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return adminPages(path);
    return entry === "page.tsx" ? [path] : [];
  });
}

/**
 * What a page does before it has checked who is asking. Only reading the route
 * and query parameters is allowed: they are the visitor's own input, not data.
 */
function whatRunsBeforeTheCheck(source: string): string | null {
  const start = source.search(/export default (?:async )?function \w+\(/);
  if (start === -1) return "no default page function";
  const body = source.slice(start);
  const gate = body.search(/requireAdminForPage\(|readAdminSession\(/);
  if (gate === -1) return "no admin check at all";

  const before = body
    .slice(0, gate)
    // The `await` or `(!(await ` that belongs to the check itself.
    .replace(/(?:[\s(!]|\bawait\b)+$/, "")
    .replace(/await\s+(?:params|searchParams)\b/g, "");
  if (/\bawait\b|Promise\.all/.test(before)) {
    return "reads something before the admin check";
  }
  // `Promise.all([load(), readAdminSession()])` checks while it loads.
  if (/Promise\.all\(\s*\[[^\]]*$/.test(body.slice(0, gate))) {
    return "checks inside Promise.all, alongside a data read";
  }
  return null;
}

describe("admin pages check access before reading data", () => {
  const pages = adminPages(adminDirectory).map((path) => ({
    path: path.slice(adminDirectory.length + 1),
    source: readFileSync(path, "utf8"),
  }));

  it("finds the admin pages", () => {
    expect(pages.length).toBeGreaterThan(20);
  });

  it.each(pages.map((page) => [page.path, page.source] as const))(
    "%s",
    (_path, source) => {
      expect(whatRunsBeforeTheCheck(source)).toBeNull();
    },
  );

  it("notices a page that reads data first", () => {
    expect(
      whatRunsBeforeTheCheck(
        "export default async function P() {\n const rows = await listUsers();\n await requireAdminForPage();\n}",
      ),
    ).toBe("reads something before the admin check");
    expect(
      whatRunsBeforeTheCheck(
        "export default async function P() {\n const [rows, admin] = await Promise.all([listUsers(), readAdminSession()]);\n}",
      ),
    ).not.toBeNull();
    expect(
      whatRunsBeforeTheCheck(
        "export default async function P() {\n return null;\n}",
      ),
    ).toBe("no admin check at all");
  });

  it("allows reading the query before the check", () => {
    expect(
      whatRunsBeforeTheCheck(
        "export default async function P({ searchParams }: X) {\n const { q } = await searchParams;\n await requireAdminForPage();\n}",
      ),
    ).toBeNull();
  });
});

describe("requireAdminForPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a 404 to anyone who is not a private, signed-in platform admin", async () => {
    readAdminSession.mockResolvedValue(null);

    await expect(requireAdminForPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("returns the administrator's session", async () => {
    const session = { userId: "u1", name: "Admin", email: "a@example.invalid" };
    readAdminSession.mockResolvedValue(session);

    await expect(requireAdminForPage()).resolves.toBe(session);
    expect(notFound).not.toHaveBeenCalled();
  });
});
