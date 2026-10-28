import { describe, expect, it } from "vitest";
import {
  mutedKindsFor,
  NOTICE_PREFERENCE_OPTIONS,
  parsePreferenceOutcome,
  readEnabledKinds,
} from "./notice-preferences-model";
import { NOTIFICATION_KINDS } from "./notification-model";

describe("notice preference model", () => {
  it("offers a switch for every notification kind exactly once", () => {
    expect(NOTICE_PREFERENCE_OPTIONS.map((o) => o.kind).sort()).toEqual(
      [...NOTIFICATION_KINDS].sort(),
    );
  });

  it("keeps only known kinds, once each, ignoring forged values", () => {
    expect(
      readEnabledKinds([
        "place_digest",
        "place_digest",
        "__proto__",
        "drop table",
        42,
        null,
        "followed_offer",
      ]),
    ).toEqual(["place_digest", "followed_offer"]);
  });

  it("mutes every kind that is not left on", () => {
    expect(mutedKindsFor([])).toEqual([...NOTIFICATION_KINDS]);
    expect(mutedKindsFor([...NOTIFICATION_KINDS])).toEqual([]);
    expect(mutedKindsFor(["owner_digest"])).not.toContain("owner_digest");
    expect(mutedKindsFor(["owner_digest"])).toHaveLength(
      NOTIFICATION_KINDS.length - 1,
    );
  });

  it("reads only known outcomes from the address", () => {
    expect(parsePreferenceOutcome("saved")).toBe("saved");
    expect(parsePreferenceOutcome(["unavailable", "saved"])).toBe(
      "unavailable",
    );
    expect(parsePreferenceOutcome("__proto__")).toBeNull();
    expect(parsePreferenceOutcome(undefined)).toBeNull();
  });
});
