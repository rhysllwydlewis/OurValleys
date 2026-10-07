import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  countAuthorizationCalls,
  findReducedAuthorizationChecks,
  findSensitiveChanges,
  isCheckableSource,
  listChangedFiles,
  parseAuthorizationChecks,
  parseSensitivePatterns,
  readChangedSources,
} from "../../scripts/check-sensitive-paths";

const repositoryRoot = resolve(__dirname, "../..");

function createRepository(prefix: string) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.test",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { cwd: directory, encoding: "utf8" },
    );
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), content);
  };
  const dispose = () => rmSync(directory, { recursive: true, force: true });
  return { directory, git, write, dispose };
}

describe("parseSensitivePatterns", () => {
  it("ignores blank lines and comments", () => {
    expect(
      parseSensitivePatterns("# note\n\nsrc/a.ts\n  src/dir/  \n# end\n"),
    ).toEqual(["src/a.ts", "src/dir/"]);
  });

  it("keeps exception lines", () => {
    expect(parseSensitivePatterns(".github/\n!.github/keep.yml\n")).toEqual([
      ".github/",
      "!.github/keep.yml",
    ]);
  });

  it.each([
    ["an absolute path", "/src/a.ts"],
    ["a parent reference", "src/../a.ts"],
    ["a glob star", "src/*.ts"],
    ["a glob question mark", "src/a?.ts"],
    ["a character class", "src/[ab].ts"],
    ["an empty exception", "src/a.ts\n!"],
    ["a doubled exception marker", "src/a.ts\n!!src/b.ts"],
    ["an absolute exception", "src/a.ts\n!/src/b.ts"],
  ])("rejects %s instead of silently weakening the check", (_label, source) => {
    expect(() => parseSensitivePatterns(source)).toThrow(/Unsupported/);
  });

  it("rejects a list with no usable paths", () => {
    expect(() => parseSensitivePatterns("# nothing\n\n")).toThrow(/empty/);
  });

  it("rejects a list that only has exceptions", () => {
    expect(() => parseSensitivePatterns("!src/a.ts\n")).toThrow(/empty/);
  });

  it("leaves call: lines to the authorization-check parser", () => {
    expect(parseSensitivePatterns("src/a.ts\ncall:readAdminSession\n")).toEqual(
      ["src/a.ts"],
    );
    expect(() => parseSensitivePatterns("call:readAdminSession\n")).toThrow(
      /empty/,
    );
  });
});

describe("parseAuthorizationChecks", () => {
  it("reads call: lines and ignores everything else", () => {
    expect(
      parseAuthorizationChecks(
        "# note\nsrc/a.ts\ncall:readAdminSession\n  call:canUserAccessBusiness  \n!src/b.ts\n",
      ),
    ).toEqual(["readAdminSession", "canUserAccessBusiness"]);
  });

  it("returns nothing when no helper is named", () => {
    expect(parseAuthorizationChecks("src/a.ts\n")).toEqual([]);
  });

  it("reports a repeated helper once", () => {
    expect(parseAuthorizationChecks("call:a\ncall:b\ncall:a\n")).toEqual([
      "a",
      "b",
    ]);
  });

  it("accepts identifiers containing a dollar sign", () => {
    expect(parseAuthorizationChecks("call:$guard\ncall:guard$\n")).toEqual([
      "$guard",
      "guard$",
    ]);
  });

  it.each([
    ["an empty name", "call:"],
    ["a regular expression", "call:read.*"],
    ["a dotted name", "call:session.read"],
    ["a name with a space", "call:read Admin"],
    ["a leading digit", "call:1check"],
  ])("rejects %s so a typo cannot stop a helper being watched", (_l, line) => {
    expect(() => parseAuthorizationChecks(line)).toThrow(/Unsupported/);
  });
});

describe("countAuthorizationCalls", () => {
  const count = (source: string, name = "readAdminSession") =>
    countAuthorizationCalls(source, name);

  it("counts plain, awaited, member and repeated calls", () => {
    expect(
      count(
        "await readAdminSession();\nconst s = readAdminSession ( );\nauth.readAdminSession();\n",
      ),
    ).toBe(3);
  });

  it("does not count an import, a bare reference, or the helper's definition", () => {
    expect(
      count(
        'import { readAdminSession } from "@/x";\nexport async function readAdminSession() {}\nconst f = readAdminSession;\n',
      ),
    ).toBe(0);
  });

  it("does not count comments, so replacing a call with a comment is seen", () => {
    expect(
      count(
        "// readAdminSession();\n/* readAdminSession(); */\n/**\n * readAdminSession()\n */\n",
      ),
    ).toBe(0);
    expect(
      count("const url = 'https://x.test'; readAdminSession(); // note"),
    ).toBe(1);
  });

  it("counts whole identifiers only", () => {
    expect(
      count(
        "readAdminSessionExtra();\nmyreadAdminSession();\nreadAdminSession2();\n",
      ),
    ).toBe(0);
  });

  it("handles helper names containing a dollar sign", () => {
    expect(count("$guard(); xguard$();", "$guard")).toBe(1);
    expect(count("guard$(); guard$ ();", "guard$")).toBe(2);
  });
});

describe("findReducedAuthorizationChecks", () => {
  const checks = ["readAdminSession", "canUserAccessBusiness"];
  const file = (path: string, before: string, after: string) => ({
    path,
    before,
    after,
  });

  it("flags a check that was deleted", () => {
    expect(
      findReducedAuthorizationChecks(
        [
          file(
            "src/app/admin/x/actions.ts",
            "const s = await readAdminSession();\nawait readAdminSession();\n",
            "const s = await readAdminSession();\n",
          ),
        ],
        checks,
      ),
    ).toEqual([
      {
        name: "readAdminSession",
        files: [{ path: "src/app/admin/x/actions.ts", before: 2, after: 1 }],
      },
    ]);
  });

  it("flags a check that was replaced by something else", () => {
    expect(
      findReducedAuthorizationChecks(
        [
          file(
            "src/app/admin/x/actions.ts",
            "if (!(await readAdminSession())) return;\n",
            "if (!user) return;\n",
          ),
        ],
        checks,
      ),
    ).toMatchObject([{ name: "readAdminSession" }]);
  });

  it("flags a call replaced by a comment or by a bare import", () => {
    for (const after of [
      "// readAdminSession();\n",
      'import { readAdminSession } from "@/x";\n',
      "const f = readAdminSession;\n",
    ]) {
      expect(
        findReducedAuthorizationChecks(
          [file("src/app/a.ts", "await readAdminSession();\n", after)],
          checks,
        ),
      ).toMatchObject([{ name: "readAdminSession" }]);
    }
  });

  it("flags a deleted file that held checks", () => {
    expect(
      findReducedAuthorizationChecks(
        [file("src/app/admin/old.ts", "canUserAccessBusiness(a);\n", "")],
        checks,
      ),
    ).toMatchObject([{ name: "canUserAccessBusiness" }]);
  });

  it("is judged per file: a new use elsewhere cannot hide a deleted check", () => {
    expect(
      findReducedAuthorizationChecks(
        [
          file("src/app/admin/a/actions.ts", "await readAdminSession();\n", ""),
          file("src/app/admin/b/actions.ts", "", "await readAdminSession();\n"),
        ],
        checks,
      ),
    ).toEqual([
      {
        name: "readAdminSession",
        files: [{ path: "src/app/admin/a/actions.ts", before: 1, after: 0 }],
      },
    ]);
  });

  it("holds a check moved between files, because moving one is a decision", () => {
    expect(
      findReducedAuthorizationChecks(
        [
          file("src/app/a.tsx", "canUserAccessBusiness(a);\n", ""),
          file("src/app/b.tsx", "", "canUserAccessBusiness(a);\n"),
        ],
        checks,
      ),
    ).toMatchObject([
      {
        name: "canUserAccessBusiness",
        files: [{ path: "src/app/a.tsx" }],
      },
    ]);
  });

  it("does not flag added checks, new protected files or unrelated edits", () => {
    expect(
      findReducedAuthorizationChecks(
        [
          file("src/app/new.ts", "", "await readAdminSession();\n"),
          file("src/app/page.tsx", "const a = 1;\n", "const a = 2;\n"),
          file(
            "src/app/grow.ts",
            "await readAdminSession();\n",
            "await readAdminSession();\nawait readAdminSession();\n",
          ),
        ],
        checks,
      ),
    ).toEqual([]);
  });

  it("ignores tests, mocks and files outside src, so they cannot offset or trip it", () => {
    expect(
      findReducedAuthorizationChecks(
        [
          file("src/app/a.test.ts", "readAdminSession();\n", ""),
          file("src/app/a.spec.tsx", "readAdminSession();\n", ""),
          file("src/app/__tests__/a.ts", "readAdminSession();\n", ""),
          file("src/test/helper.ts", "readAdminSession();\n", ""),
          file("tests/unit/a.ts", "readAdminSession();\n", ""),
          file("docs/a.md", "readAdminSession()\n", ""),
          file("scripts/a.ts", "readAdminSession();\n", ""),
        ],
        checks,
      ),
    ).toEqual([]);

    // A test file that calls the helper cannot offset a real removal either.
    expect(
      findReducedAuthorizationChecks(
        [
          file("src/app/admin/a/actions.ts", "await readAdminSession();\n", ""),
          file("src/app/admin/a/actions.spec.ts", "", "readAdminSession();\n"),
        ],
        checks,
      ),
    ).toMatchObject([{ name: "readAdminSession" }]);
  });
});

describe("isCheckableSource", () => {
  it.each([
    ["src/app/admin/x/actions.ts", true],
    ["src/components/a.tsx", true],
    ["src/lib/a.js", true],
    ["src/lib/a.jsx", true],
    ["src/lib/a.mjs", true],
    ["src/lib/a.cts", true],
    ["src/lib/a.test.ts", false],
    ["src/lib/a.test.tsx", false],
    ["src/lib/a.spec.ts", false],
    ["src/lib/a.spec.mjs", false],
    ["src/lib/__tests__/a.ts", false],
    ["src/test/server-only.ts", false],
    ["tests/unit/a.ts", false],
    ["src/readme.md", false],
    ["src/styles.css", false],
    ["scripts/a.ts", false],
  ])("%s -> %s", (path, expected) => {
    expect(isCheckableSource(path)).toBe(expected);
  });
});

describe("findSensitiveChanges", () => {
  const patterns = ["src/lib/auth.ts", "src/app/api/auth/", ".github/"];

  it("matches exact files and everything under a directory", () => {
    expect(
      findSensitiveChanges(
        [
          "src/lib/auth.ts",
          "src/app/api/auth/[...all]/route.ts",
          ".github/workflows/ci.yml",
        ],
        patterns,
      ),
    ).toEqual([
      ".github/workflows/ci.yml",
      "src/app/api/auth/[...all]/route.ts",
      "src/lib/auth.ts",
    ]);
  });

  it("does not match lookalike names", () => {
    expect(
      findSensitiveChanges(
        [
          "src/lib/auth.test.ts",
          "src/lib/auth.ts.bak",
          "src/lib/auth-client.ts",
          "src/app/api/authentic/route.ts",
          "docs/.github/notes.md",
        ],
        patterns,
      ),
    ).toEqual([]);
  });

  it("normalises a leading ./ and ignores blank entries", () => {
    expect(
      findSensitiveChanges(["./src/lib/auth.ts", "", "  "], patterns),
    ).toEqual(["src/lib/auth.ts"]);
  });

  it("returns nothing when no file is reserved", () => {
    expect(
      findSensitiveChanges(["README.md", "src/app/page.tsx"], patterns),
    ).toEqual([]);
    expect(findSensitiveChanges([], patterns)).toEqual([]);
  });

  it("de-duplicates repeated files", () => {
    expect(
      findSensitiveChanges(["src/lib/auth.ts", "src/lib/auth.ts"], patterns),
    ).toEqual(["src/lib/auth.ts"]);
  });

  it("lets an exception carve one file out of a reserved directory only", () => {
    const withException = [...patterns, "!.github/workflows/keep.yml"];
    expect(
      findSensitiveChanges(
        [
          ".github/workflows/keep.yml",
          ".github/workflows/other.yml",
          ".github/workflows/keep.yml.bak",
        ],
        withException,
      ),
    ).toEqual([
      ".github/workflows/keep.yml.bak",
      ".github/workflows/other.yml",
    ]);
  });

  it("does not let an exception unreserve a file that is reserved by name", () => {
    // The exception names a different file, so the exact-file entry still wins.
    expect(
      findSensitiveChanges(
        ["src/lib/auth.ts"],
        [...patterns, "!src/lib/auth.test.ts"],
      ),
    ).toEqual(["src/lib/auth.ts"]);
  });
});

describe("listChangedFiles against a real git repository", () => {
  const repository = createRepository("sensitive-paths-");
  afterAll(repository.dispose);

  it("returns unusual names verbatim so they cannot slip past a prefix match", () => {
    const { directory, git, write } = repository;
    git("init", "-q", "-b", "main");
    write("src/lib/auth.ts", "export {};\n");
    write("README.md", "base\n");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    git("checkout", "-q", "-b", "change");

    // A non-ASCII name, a name with a space and a name with a double quote:
    // git quotes all three in its default output.
    write(".github/workflows/ünï cödé.yml", "x\n");
    write('.github/with"quote.yml', "x\n");
    // Moving a reserved file out of its reserved location.
    renameSync(
      join(directory, "src/lib/auth.ts"),
      join(directory, "src/lib/moved.ts"),
    );
    write("docs/unrelated.md", "x\n");
    git("add", "-A");
    git("commit", "-q", "-m", "change");

    const changed = listChangedFiles("main", "change", directory);

    expect(changed).toEqual(
      expect.arrayContaining([
        ".github/workflows/ünï cödé.yml",
        '.github/with"quote.yml',
        "src/lib/auth.ts",
        "src/lib/moved.ts",
        "docs/unrelated.md",
      ]),
    );
    expect(
      findSensitiveChanges(changed, ["src/lib/auth.ts", ".github/"]),
    ).toEqual([
      '.github/with"quote.yml',
      ".github/workflows/ünï cödé.yml",
      "src/lib/auth.ts",
    ]);
  });
});

describe("readChangedSources against a real git repository", () => {
  const repository = createRepository("sensitive-sources-");
  afterAll(repository.dispose);

  it("sees a deleted check, a moved check and a deleted file", () => {
    const { directory, git, write } = repository;
    git("init", "-q", "-b", "main");
    write(
      "src/app/admin/a/actions.ts",
      "await readAdminSession();\nawait readAdminSession();\n",
    );
    write(
      "src/app/dash/[businessId]/page.tsx",
      "await canUserAccessBusiness(x);\n",
    );
    write("src/app/old.ts", "await isPlatformAdmin(u);\n");
    write("src/app/other.ts", "export const a = 1;\n");
    git("add", "-A");
    git("commit", "-q", "-m", "base");

    git("checkout", "-q", "-b", "change");
    write("src/app/admin/a/actions.ts", "await readAdminSession();\n");
    renameSync(
      join(directory, "src/app/dash/[businessId]/page.tsx"),
      join(directory, "src/app/dash/[businessId]/moved.tsx"),
    );
    rmSync(join(directory, "src/app/old.ts"));
    git("add", "-A");
    git("commit", "-q", "-m", "change");

    // Meanwhile the base moves on, which must not be counted against the PR.
    git("checkout", "-q", "main");
    write("src/app/other.ts", "export const a = 2;\n");
    git("add", "-A");
    git("commit", "-q", "-m", "base moves on");

    const changed = listChangedFiles("main", "change", directory);
    expect(changed).not.toContain("src/app/other.ts");

    const sources = readChangedSources("main", "change", changed, directory);
    expect(
      findReducedAuthorizationChecks(sources, [
        "readAdminSession",
        "canUserAccessBusiness",
        "isPlatformAdmin",
      ]),
    ).toEqual([
      {
        name: "readAdminSession",
        files: [{ path: "src/app/admin/a/actions.ts", before: 2, after: 1 }],
      },
      {
        name: "canUserAccessBusiness",
        files: [
          { path: "src/app/dash/[businessId]/page.tsx", before: 1, after: 0 },
        ],
      },
      {
        name: "isPlatformAdmin",
        files: [{ path: "src/app/old.ts", before: 1, after: 0 }],
      },
    ]);
  });

  it("fails loudly on an unknown revision instead of silently passing", () => {
    expect(() =>
      readChangedSources(
        "main",
        "no-such-revision",
        ["src/app/admin/a/actions.ts"],
        repository.directory,
      ),
    ).toThrow();
  });
});

describe("the committed sensitive path list", () => {
  const source = readFileSync(
    resolve(repositoryRoot, ".github/sensitive-paths.txt"),
    "utf8",
  );
  const patterns = parseSensitivePatterns(source);

  it("parses", () => {
    expect(patterns.length).toBeGreaterThan(0);
  });

  it("only names exact entries that are existing files, so a rename cannot silently drop protection", () => {
    const isFile = (path: string) => {
      try {
        // A file refactored into a same-named directory must not pass.
        return statSync(resolve(repositoryRoot, path)).isFile();
      } catch {
        return false;
      }
    };
    const notFiles = patterns
      .map((pattern) => (pattern.startsWith("!") ? pattern.slice(1) : pattern))
      .filter((pattern) => !pattern.endsWith("/"))
      .filter((pattern) => !isFile(pattern));
    expect(notFiles).toEqual([]);
  });

  it("names authorization helpers that application code still calls", () => {
    const checks = parseAuthorizationChecks(source);
    expect(checks.length).toBeGreaterThan(0);

    const sources: string[] = [];
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(path);
        } else if (
          isCheckableSource(relative(repositoryRoot, path).split(sep).join("/"))
        ) {
          sources.push(readFileSync(path, "utf8"));
        }
      }
    };
    walk(resolve(repositoryRoot, "src"));

    // Counting calls (not mentions or the definition) means a helper that is
    // renamed, or that nothing calls any more, is reported instead of silently
    // going unwatched.
    const uncalled = checks.filter(
      (name) =>
        !sources.some((content) => countAuthorizationCalls(content, name) > 0),
    );
    expect(uncalled).toEqual([]);
  });

  it("covers the repository controls that govern this check", () => {
    expect(
      findSensitiveChanges(
        [
          ".github/sensitive-paths.txt",
          ".github/workflows/sensitive-paths.yml",
          ".github/workflows/ci.yml",
          "scripts/check-sensitive-paths.ts",
        ],
        patterns,
      ),
    ).toEqual([
      ".github/sensitive-paths.txt",
      ".github/workflows/ci.yml",
      ".github/workflows/sensitive-paths.yml",
      "scripts/check-sensitive-paths.ts",
    ]);
  });

  it("covers the access-control and projection files the owner reserves", () => {
    expect(
      findSensitiveChanges(
        [
          "src/lib/auth.ts",
          "src/proxy.ts",
          "src/app/api/auth/[...all]/route.ts",
          "src/modules/businesses/permissions.ts",
          "src/modules/businesses/site-projection.ts",
          "src/modules/payments/checkout.ts",
          "src/lib/public-demo-policy.ts",
        ],
        patterns,
      ),
    ).toHaveLength(7);
  });

  it("does not hold routine migration or search work that the owner authorised", () => {
    expect(
      findSensitiveChanges(
        [
          // Every migration PR bumps the expected migration count here.
          ".github/workflows/standard-postgres.yml",
          "drizzle/0040_example.sql",
          "drizzle/meta/_journal.json",
          // Directory search and filter work lives here.
          "src/modules/businesses/public.ts",
          "src/app/businesses/page.tsx",
          "docs/37-sensitive-path-check.md",
        ],
        patterns,
      ),
    ).toEqual([]);
  });
});
