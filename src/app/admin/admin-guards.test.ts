import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static guard for the admin area. A layout is not a security boundary: a page
 * or server action that does not check for itself still runs, and a page's data
 * is still sent in the response to a visitor the layout hides it from. So every
 * admin page must refuse BEFORE it reads any data, and every admin server action
 * must call the guard itself.
 */

const adminRoot = __dirname;

function filesNamed(name: string, dir = adminRoot): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return filesNamed(name, path);
    return entry === name ? [path] : [];
  });
}

const GUARD = /readAdminSession\s*\(/;

/** The part of a page from `export default` onwards. */
function pageBody(source: string): string {
  const start = source.search(/export default (?:async )?function \w+\(/);
  return start === -1 ? "" : source.slice(start);
}

describe("admin pages", () => {
  const pages = filesNamed("page.tsx");

  it("finds the admin pages", () => {
    expect(pages.length).toBeGreaterThan(20);
  });

  it.each(pages.map((p) => [relative(adminRoot, p), p]))(
    "%s checks for an admin before it reads any data",
    (_name, path) => {
      const body = pageBody(readFileSync(path as string, "utf8"));
      const guard = body.search(GUARD);
      expect(guard, "no readAdminSession() call in the page").toBeGreaterThan(
        -1,
      );

      // Anything awaited before the guard other than the route's own params.
      const before = body.slice(0, guard);
      const dataBeforeGuard = [
        ...before.matchAll(/await\s+(?!params\b|searchParams\b)[\w.]+\s*\(/g),
      ];
      expect(
        dataBeforeGuard.map((m) => m[0]),
        "data is read before the admin check",
      ).toEqual([]);
      // Not inside a Promise.all that also loads data (parallel = unsafe).
      expect(before).not.toMatch(/Promise\.all\(\[/);
      expect(
        /Promise\.all\(\[[^\]]*readAdminSession/s.test(body),
        "the guard must not run in parallel with data loading",
      ).toBe(false);
    },
  );
});

describe("admin server actions", () => {
  const files = filesNamed("actions.ts");

  it("finds the admin action files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((p) => [relative(adminRoot, p), p]))(
    "every exported action in %s calls the admin guard",
    (_name, path) => {
      const source = readFileSync(path as string, "utf8");
      // Local helpers that call the guard themselves count as a guard call.
      const helpers = [
        ...source.matchAll(
          /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)[^{]*\{[^}]*?readAdminSession\s*\(/gs,
        ),
      ].map((m) => m[1] as string);
      const parts = source.split(/^export\s+async\s+function\s+/m).slice(1);
      const unguarded = parts
        .filter(
          (part) =>
            !GUARD.test(part) &&
            !helpers.some((h) => new RegExp(`\\b${h}\\s*\\(`).test(part)),
        )
        .map((part) => /^\w+/.exec(part)?.[0]);
      expect(unguarded, "exported actions without an admin check").toEqual([]);
    },
  );
});
