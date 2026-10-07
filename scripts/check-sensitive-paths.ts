import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Parses the reserved-path list. Throws on anything it cannot honour exactly,
 * so a typo can never silently weaken the check.
 */
export function parseSensitivePatterns(source: string): string[] {
  const patterns: string[] = [];

  for (const [index, rawLine] of source.split("\n").entries()) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    if (line.startsWith("/") || line.includes("..") || /[*?[\]]/.test(line)) {
      throw new Error(
        `Unsupported sensitive path on line ${index + 1}: "${line}". Use repository-relative paths without globs.`,
      );
    }
    patterns.push(line);
  }

  if (patterns.length === 0) {
    throw new Error("The sensitive path list is empty.");
  }

  return patterns;
}

/** Returns the changed files that fall under a reserved path, sorted. */
export function findSensitiveChanges(
  changedFiles: readonly string[],
  patterns: readonly string[],
): string[] {
  const matches = new Set<string>();

  for (const rawFile of changedFiles) {
    const file = rawFile.trim().replace(/^\.\//, "");
    if (file === "") {
      continue;
    }
    const isSensitive = patterns.some((pattern) =>
      pattern.endsWith("/") ? file.startsWith(pattern) : file === pattern,
    );
    if (isSensitive) {
      matches.add(file);
    }
  }

  return [...matches].sort();
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

  // --no-renames lists both sides of a rename, so moving a reserved file to an
  // unreserved location is still caught.
  const changed = execFileSync(
    "git",
    ["diff", "--name-only", "--no-renames", `${base}...${head}`],
    { encoding: "utf8" },
  ).split("\n");
  const sensitive = findSensitiveChanges(changed, patterns);

  if (sensitive.length === 0) {
    console.info("No owner-decision paths changed.");
    return;
  }

  console.error(
    "::error title=Owner decision required::This pull request changes files reserved for an owner decision (authentication, access control, the public business projection, payments or repository controls). Do not merge it autonomously.",
  );
  for (const file of sensitive) {
    console.error(`- ${file}`);
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
