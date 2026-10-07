import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** A list line of the form `call:name` names an authorization helper. */
const authorizationCheckPrefix = "call:";

/**
 * Parses the reserved-path list. A line is a repository-relative file, a
 * directory with a trailing "/", or either of those prefixed with "!" to carve
 * an exception out of a reserved directory. Throws on anything it cannot honour
 * exactly, so a typo can never silently weaken the check.
 */
export function parseSensitivePatterns(source: string): string[] {
  const patterns: string[] = [];

  for (const [index, rawLine] of source.split("\n").entries()) {
    const line = rawLine.trim();
    if (
      line === "" ||
      line.startsWith("#") ||
      line.startsWith(authorizationCheckPrefix)
    ) {
      continue;
    }
    const path = line.startsWith("!") ? line.slice(1) : line;
    if (
      path === "" ||
      path.startsWith("/") ||
      path.startsWith("!") ||
      path.includes("..") ||
      /[*?[\]]/.test(path)
    ) {
      throw new Error(
        `Unsupported sensitive path on line ${index + 1}: "${line}". Use repository-relative paths without globs.`,
      );
    }
    patterns.push(line);
  }

  if (!patterns.some((pattern) => !pattern.startsWith("!"))) {
    throw new Error("The sensitive path list is empty.");
  }

  return patterns;
}

function matchesPath(pattern: string, file: string): boolean {
  return pattern.endsWith("/") ? file.startsWith(pattern) : file === pattern;
}

/**
 * Returns the changed files that fall under a reserved path and are not
 * carved out by a "!" exception, sorted.
 */
export function findSensitiveChanges(
  changedFiles: readonly string[],
  patterns: readonly string[],
): string[] {
  const reserved = patterns.filter((pattern) => !pattern.startsWith("!"));
  const exceptions = patterns
    .filter((pattern) => pattern.startsWith("!"))
    .map((pattern) => pattern.slice(1));
  const matches = new Set<string>();

  for (const rawFile of changedFiles) {
    const file = rawFile.replace(/^\.\//, "");
    if (file === "") {
      continue;
    }
    const isReserved = reserved.some((pattern) => matchesPath(pattern, file));
    const isException = exceptions.some((pattern) =>
      matchesPath(pattern, file),
    );
    if (isReserved && !isException) {
      matches.add(file);
    }
  }

  return [...matches].sort();
}

/**
 * Lists the files a pull request changes relative to its merge base. Output is
 * NUL-separated so unusual file names (spaces, quotes, non-ASCII) are returned
 * verbatim instead of being quoted by git, which would let them slip past a
 * prefix match. --no-renames lists both sides of a rename, so moving a
 * reserved file somewhere unreserved is still caught.
 */
export function listChangedFiles(
  base: string,
  head: string,
  cwd?: string,
): string[] {
  const output = execFileSync(
    "git",
    ["diff", "-z", "--name-only", "--no-renames", `${base}...${head}`],
    { encoding: "utf8", ...(cwd ? { cwd } : {}) },
  );
  return output.split("\0").filter((file) => file !== "");
}

/**
 * Parses the `call:name` lines: authorization helpers whose calls protect
 * actions wherever they appear. Throws on anything that is not a plain
 * identifier, so a typo cannot stop a helper being watched. Repeated names
 * are reported once.
 */
export function parseAuthorizationChecks(source: string): string[] {
  const names = new Set<string>();

  for (const [index, rawLine] of source.split("\n").entries()) {
    const line = rawLine.trim();
    if (!line.startsWith(authorizationCheckPrefix)) {
      continue;
    }
    const name = line.slice(authorizationCheckPrefix.length);
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      throw new Error(
        `Unsupported authorization check on line ${index + 1}: "${line}". Use a plain identifier.`,
      );
    }
    names.add(name);
  }

  return [...names];
}

export type ChangedSource = { path: string; before: string; after: string };
export type ReducedCheck = {
  name: string;
  files: { path: string; before: number; after: number }[];
};

const sourceExtension = /\.[cm]?[jt]sx?$/;
// Files that never run in production. They must not be able to supply "added"
// uses that offset a removed check, nor be policed themselves.
const nonProductionSource =
  /\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)__tests__\/|^src\/test\//;

/** Application source that can contain an authorization call. */
export function isCheckableSource(path: string): boolean {
  return (
    path.startsWith("src/") &&
    sourceExtension.test(path) &&
    !nonProductionSource.test(path)
  );
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\'"`])\/\/.*$/gm, "$1");
}

/**
 * Counts calls to a helper: `name(` or `obj.name(`, outside comments, and not
 * the helper's own `function name(` definition. Mentions in comments, strings
 * and import lines do not count, so replacing a call with a comment is seen.
 */
export function countAuthorizationCalls(source: string, name: string): number {
  const escaped = name.replace(/\$/g, "\\$");
  const call = new RegExp(
    `(?<![\\w$])(?<!\\bfunction\\s+)${escaped}\\s*\\(`,
    "g",
  );
  return stripComments(source).match(call)?.length ?? 0;
}

/**
 * Finds authorization helpers that some changed source file calls fewer times
 * than before. This is judged per file, not summed over the pull request, so a
 * deleted check cannot be hidden by an unrelated new use elsewhere. The price
 * is that moving or consolidating checks across files is also held; that is
 * deliberate, because moving an authorization check is exactly the change an
 * owner should look at. Adding checks, or new files that use them, never trips
 * this rule.
 */
export function findReducedAuthorizationChecks(
  files: readonly ChangedSource[],
  names: readonly string[],
): ReducedCheck[] {
  const checkable = files.filter((file) => isCheckableSource(file.path));
  const result: ReducedCheck[] = [];

  for (const name of names) {
    const reduced = checkable
      .map((file) => ({
        path: file.path,
        before: countAuthorizationCalls(file.before, name),
        after: countAuthorizationCalls(file.after, name),
      }))
      .filter((file) => file.after < file.before);
    if (reduced.length > 0) {
      result.push({ name, files: reduced });
    }
  }

  return result;
}

/**
 * True if the path exists at the revision. git ls-tree exits 0 with no output
 * for a path that is absent and fails for a bad revision or a damaged
 * repository, so only a genuinely absent file reads as absent and every other
 * failure is thrown.
 */
function existsAtRevision(
  revision: string,
  path: string,
  cwd?: string,
): boolean {
  const output = execFileSync(
    "git",
    ["ls-tree", "-z", "--name-only", revision, "--", path],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...(cwd ? { cwd } : {}),
    },
  );
  return output.split("\0").includes(path);
}

/** Reads a file at a revision; a file absent there (added/deleted) is empty. */
function readBlob(revision: string, path: string, cwd?: string): string {
  if (!existsAtRevision(revision, path, cwd)) {
    return "";
  }
  return execFileSync("git", ["show", `${revision}:${path}`], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...(cwd ? { cwd } : {}),
  });
}

/** Reads the merge-base and head contents of every changed source file. */
export function readChangedSources(
  base: string,
  head: string,
  files: readonly string[],
  cwd?: string,
): ChangedSource[] {
  const mergeBase = execFileSync("git", ["merge-base", base, head], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...(cwd ? { cwd } : {}),
  }).trim();

  return files.filter(isCheckableSource).map((path) => ({
    path,
    before: readBlob(mergeBase, path, cwd),
    after: readBlob(head, path, cwd),
  }));
}

function readArguments(argv: readonly string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(
        "Usage: check-sensitive-paths --base <sha> --head <sha> --patterns <file>",
      );
    }
    values.set(flag.slice(2), value);
  }

  const base = values.get("base");
  const head = values.get("head");
  const patterns = values.get("patterns");
  if (!base || !head || !patterns) {
    throw new Error(
      "Usage: check-sensitive-paths --base <sha> --head <sha> --patterns <file>",
    );
  }
  return { base, head, patterns };
}

// A file name can contain a newline; never let it start a log line that the
// runner would read as a workflow command.
function printable(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, "?");
}

function main() {
  const {
    base,
    head,
    patterns: patternsPath,
  } = readArguments(process.argv.slice(2));
  const source = readFileSync(patternsPath, "utf8");
  const patterns = parseSensitivePatterns(source);
  const checks = parseAuthorizationChecks(source);

  const changed = listChangedFiles(base, head);
  const sensitive = findSensitiveChanges(changed, patterns);
  const reduced = findReducedAuthorizationChecks(
    readChangedSources(base, head, changed),
    checks,
  );

  if (sensitive.length === 0 && reduced.length === 0) {
    console.info("No owner-decision paths or authorization checks changed.");
    return;
  }

  console.error(
    "::error title=Owner decision required::This pull request changes files reserved for an owner decision (authentication, access control, the public business projection, payments or repository controls) or reduces the calls to an authorization helper in a file. Do not merge it autonomously.",
  );
  for (const file of sensitive) {
    console.error(`- ${printable(file)}`);
  }
  for (const check of reduced) {
    for (const file of check.files) {
      console.error(
        `- ${check.name}() is called fewer times in ${printable(file.path)} (${file.before} before, ${file.after} after)`,
      );
    }
  }
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
