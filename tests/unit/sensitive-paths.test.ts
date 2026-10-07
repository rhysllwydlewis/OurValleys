import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findSensitiveChanges,
  parseSensitivePatterns,
} from "../../scripts/check-sensitive-paths";

const repositoryRoot = resolve(__dirname, "../..");

describe("parseSensitivePatterns", () => {
  it("ignores blank lines and comments", () => {
    expect(
      parseSensitivePatterns("# note\n\nsrc/a.ts\n  src/dir/  \n# end\n"),
    ).toEqual(["src/a.ts", "src/dir/"]);
  });

  it.each([
    ["an absolute path", "/src/a.ts"],
    ["a parent reference", "src/../a.ts"],
    ["a glob star", "src/*.ts"],
    ["a glob question mark", "src/a?.ts"],
    ["a character class", "src/[ab].ts"],
  ])("rejects %s instead of silently weakening the check", (_label, line) => {
    expect(() => parseSensitivePatterns(line)).toThrow(/Unsupported/);
  });

  it("rejects a list with no usable paths", () => {
    expect(() => parseSensitivePatterns("# nothing\n\n")).toThrow(/empty/);
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
          "scripts/check-sensitive-paths.ts",
        ],
        patterns,
      ),
    ).toEqual([
      ".github/sensitive-paths.txt",
      ".github/workflows/sensitive-paths.yml",
      "scripts/check-sensitive-paths.ts",
    ]);
  });
});
