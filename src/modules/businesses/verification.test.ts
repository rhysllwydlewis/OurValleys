import { describe, expect, it } from "vitest";
import { toPublicVerificationChecks } from "./verification";

const now = new Date("2026-10-02T12:00:00Z");
const row = (
  over: Partial<Parameters<typeof toPublicVerificationChecks>[0][0]>,
) => ({
  checkType: "premises",
  status: "active",
  checkedAt: new Date("2026-09-10T09:00:00Z"),
  expiresAt: null,
  ...over,
});

describe("toPublicVerificationChecks", () => {
  it("returns a plain label and month/year for active checks", () => {
    expect(toPublicVerificationChecks([row({})], now)).toEqual([
      {
        checkType: "premises",
        label: "Premises or service area checked",
        checkedLabel: "Sept 2026",
      },
    ]);
  });

  it("excludes revoked, expired and unknown-type checks", () => {
    const result = toPublicVerificationChecks(
      [
        row({ status: "revoked" }),
        row({ expiresAt: new Date("2026-10-01T00:00:00Z") }),
        row({ checkType: "mystery" }),
        row({ checkType: "identity", expiresAt: new Date("2027-01-01") }),
      ],
      now,
    );
    expect(result.map((c) => c.checkType)).toEqual(["identity"]);
  });

  it("never exposes evidence notes or admin identity", () => {
    const result = toPublicVerificationChecks(
      [
        {
          ...row({}),
          evidenceNote: "Saw lease at 12 High St",
          checkedByEmail: "admin@example.test",
        } as never,
      ],
      now,
    );
    const json = JSON.stringify(result);
    expect(json).not.toContain("lease");
    expect(json).not.toContain("admin@");
    expect(Object.keys(result[0]!).sort()).toEqual([
      "checkType",
      "checkedLabel",
      "label",
    ]);
  });

  it("orders checks oldest first", () => {
    const result = toPublicVerificationChecks(
      [
        row({ checkType: "identity", checkedAt: new Date("2026-09-20") }),
        row({ checkType: "premises", checkedAt: new Date("2026-08-01") }),
      ],
      now,
    );
    expect(result.map((c) => c.checkType)).toEqual(["premises", "identity"]);
  });
});
