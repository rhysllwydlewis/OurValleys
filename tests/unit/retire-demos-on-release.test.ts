import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  retireOnReleaseFlag,
  shouldRetireOnRelease,
} from "../../scripts/retire-demos-on-release";

const packageScripts = (
  JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { scripts: Record<string, string> }
).scripts;

describe("shouldRetireOnRelease", () => {
  it("acts only at the public stage with the flag exactly true", () => {
    expect(
      shouldRetireOnRelease({
        OURVALLEYS_RELEASE_STAGE: "public",
        [retireOnReleaseFlag]: "true",
      }),
    ).toBe(true);
  });

  it("does nothing at any other stage, even with the flag set", () => {
    for (const stage of ["development", "private_pilot", "", undefined]) {
      expect(
        shouldRetireOnRelease({
          OURVALLEYS_RELEASE_STAGE: stage,
          [retireOnReleaseFlag]: "true",
        }),
        String(stage),
      ).toBe(false);
    }
  });

  it("does nothing at the public stage without the flag, or with any other value", () => {
    for (const flag of [undefined, "", "false", "TRUE", "1", " true", "yes"]) {
      expect(
        shouldRetireOnRelease({
          OURVALLEYS_RELEASE_STAGE: "public",
          [retireOnReleaseFlag]: flag,
        }),
        String(flag),
      ).toBe(false);
    }
  });

  it("does nothing for an unknown stage name", () => {
    expect(
      shouldRetireOnRelease({
        OURVALLEYS_RELEASE_STAGE: "Public ",
        [retireOnReleaseFlag]: "true",
      }),
    ).toBe(false);
  });
});

describe("release preparation order", () => {
  it("retires after migrations and before the step that verifies the demos are gone", () => {
    const steps = (packageScripts["deploy:prepare"] ?? "")
      .split("&&")
      .map((step) => step.trim());
    const retire = steps.indexOf("pnpm auth:retire-demos:release");
    const verify = steps.indexOf("pnpm auth:provision-demo");

    expect(retire).toBeGreaterThan(steps.indexOf("pnpm db:migrate"));
    expect(verify).toBe(retire + 1);
  });

  it("keeps the gate's own check in the provisioning step", () => {
    const provisioning = readFileSync(
      new URL("../../scripts/provision-demo-account.ts", import.meta.url),
      "utf8",
    );
    expect(provisioning).toContain("assertPrivilegedDemoAccountsRemoved()");
    expect(provisioning).toContain("Public release is blocked");
  });
});
