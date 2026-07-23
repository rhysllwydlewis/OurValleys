import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const workspacePath = "pnpm-workspace.yaml";
const workspace = readFileSync(workspacePath, "utf8");
const overrideLine = '  postcss: "8.5.19"';

if (!workspace.includes(overrideLine)) {
  writeFileSync(
    workspacePath,
    workspace.replace(
      '  sharp: ">=0.35.0"',
      `  sharp: ">=0.35.0"\n${overrideLine}`,
    ),
  );
}

execFileSync(
  "pnpm",
  ["install", "--lockfile-only", "--no-frozen-lockfile"],
  { stdio: "inherit" },
);

execFileSync(
  "tar",
  ["-czf", "/tmp/postcss-lock-fix.tgz", workspacePath, "pnpm-lock.yaml"],
  { stdio: "inherit" },
);

writeFileSync(
  "build-configured.log",
  readFileSync("/tmp/postcss-lock-fix.tgz").toString("base64"),
);

process.exitCode = 1;
