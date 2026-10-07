import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

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
    if (line === "" || line.startsWith("#")) {
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

function main() {
  const {
    base,
    head,
    patterns: patternsPath,
  } = readArguments(process.argv.slice(2));
  const patterns = parseSensitivePatterns(readFileSync(patternsPath, "utf8"));

  const sensitive = findSensitiveChanges(
    listChangedFiles(base, head),
    patterns,
  );

  if (sensitive.length === 0) {
    console.info("No owner-decision paths changed.");
    return;
  }

  console.error(
    "::error title=Owner decision required::This pull request changes files reserved for an owner decision (authentication, access control, the public business projection, payments or repository controls). Do not merge it autonomously.",
  );
  for (const file of sensitive) {
    // A file name can contain a newline; never let it start a log line that
    // the runner would read as a workflow command.
    console.error(`- ${file.replace(/[\u0000-\u001f\u007f]/g, "?")}`);
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
