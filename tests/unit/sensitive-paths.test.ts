import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  findSensitiveChanges,
  listChangedFiles,
  parseSensitivePatterns,
} from "../../scripts/check-sensitive-paths";

const repositoryRoot = resolve(__dirname, "../..");

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
  const directory = mkdtempSync(join(tmpdir(), "sensitive-paths-"));
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

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("returns unusual names verbatim so they cannot slip past a prefix match", () => {
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

describe("the committed sensitive path list", () => {
  const source = readFileSync(
    resolve(repositoryRoot, ".github/sensitive-paths.txt"),
    "utf8",
  );
  const patterns = parseSensitivePatterns(source);

  it("parses", () => {
    expect(patterns.length).toBeGreaterThan(0);
  });

  it("only names exact files that exist, so a rename cannot silently drop protection", () => {
    const missing = patterns
      .map((pattern) => (pattern.startsWith("!") ? pattern.slice(1) : pattern))
      .filter((pattern) => !pattern.endsWith("/"))
      .filter((pattern) => !existsSync(resolve(repositoryRoot, pattern)));
    expect(missing).toEqual([]);
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
        ],
        patterns,
      ),
    ).toHaveLength(6);
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
