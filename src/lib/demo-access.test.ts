import { describe, expect, it } from "vitest";
import {
  DEMO_CODE_MIN_LENGTH,
  areDemosShown,
  demoAccessToken,
  getDemoAccessMode,
  isDemoCodeCorrect,
  readDemoCode,
} from "./demo-access";

const secret = "s".repeat(64);
const withCode = {
  OURVALLEYS_DEMO_CODE: "valleys-demo-2026",
  BETTER_AUTH_SECRET: secret,
};

describe("getDemoAccessMode", () => {
  it("shows demo accounts to everyone when nothing is set", () => {
    expect(getDemoAccessMode({})).toBe("open");
    for (const value of ["", "false", "0", "yes"]) {
      expect(getDemoAccessMode({ OURVALLEYS_HIDE_DEMO: value })).toBe("open");
    }
  });

  it("hides them from everyone with the hide switch and no code", () => {
    expect(getDemoAccessMode({ OURVALLEYS_HIDE_DEMO: "true" })).toBe("hidden");
    expect(getDemoAccessMode({ OURVALLEYS_HIDE_DEMO: " TRUE " })).toBe(
      "hidden",
    );
  });

  it("asks for the code once a usable one is set, whatever the hide switch says", () => {
    expect(getDemoAccessMode(withCode)).toBe("code");
    expect(
      getDemoAccessMode({ ...withCode, OURVALLEYS_HIDE_DEMO: "true" }),
    ).toBe("code");
  });

  it("fails closed for a code that is too short or cannot be remembered", () => {
    const short = "x".repeat(DEMO_CODE_MIN_LENGTH - 1);
    expect(
      getDemoAccessMode({
        OURVALLEYS_DEMO_CODE: short,
        BETTER_AUTH_SECRET: secret,
      }),
    ).toBe("hidden");
    // Never "open": a mistyped variable must not publish the demo accounts.
    expect(
      getDemoAccessMode({ OURVALLEYS_DEMO_CODE: "valleys-demo-2026" }),
    ).toBe("hidden");
    expect(getDemoAccessMode({ OURVALLEYS_DEMO_CODE: "   " })).toBe("open");
  });
});

describe("isDemoCodeCorrect", () => {
  it("accepts only the configured code, ignoring surrounding spaces", () => {
    expect(isDemoCodeCorrect("valleys-demo-2026", withCode)).toBe(true);
    expect(isDemoCodeCorrect("  valleys-demo-2026 ", withCode)).toBe(true);
    expect(isDemoCodeCorrect("valleys-demo-2027", withCode)).toBe(false);
    expect(isDemoCodeCorrect("VALLEYS-DEMO-2026", withCode)).toBe(false);
    expect(isDemoCodeCorrect("", withCode)).toBe(false);
  });

  it("accepts nothing when no usable code is set", () => {
    expect(isDemoCodeCorrect("", {})).toBe(false);
    expect(isDemoCodeCorrect("short", { OURVALLEYS_DEMO_CODE: "short" })).toBe(
      false,
    );
    expect(readDemoCode({ OURVALLEYS_DEMO_CODE: "short" })).toBeNull();
  });
});

describe("areDemosShown", () => {
  it("follows the mode when no code is involved", () => {
    expect(areDemosShown(undefined, {})).toBe(true);
    expect(areDemosShown("anything", { OURVALLEYS_HIDE_DEMO: "true" })).toBe(
      false,
    );
  });

  it("needs the unlocked device's token when a code is set", () => {
    const token = demoAccessToken(withCode)!;
    expect(areDemosShown(undefined, withCode)).toBe(false);
    expect(areDemosShown("", withCode)).toBe(false);
    expect(areDemosShown("valleys-demo-2026", withCode)).toBe(false);
    expect(areDemosShown(token, withCode)).toBe(true);
  });

  it("locks every device again when the code or the secret changes", () => {
    const token = demoAccessToken(withCode)!;
    expect(
      areDemosShown(token, {
        ...withCode,
        OURVALLEYS_DEMO_CODE: "a-different-code",
      }),
    ).toBe(false);
    expect(
      areDemosShown(token, { ...withCode, BETTER_AUTH_SECRET: "t".repeat(64) }),
    ).toBe(false);
  });

  it("never puts the code itself in the token", () => {
    const token = demoAccessToken(withCode)!;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(token).not.toContain("valleys");
  });
});
