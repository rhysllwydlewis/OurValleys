import { describe, expect, it } from "vitest";
import {
  changedFields,
  isOwnerCorrectionDecision,
  ownerCorrectionActions,
  parseSuggestionNotes,
  routesToOwner,
  suggestionLimits,
} from "./corrections-model";

describe("parseSuggestionNotes", () => {
  it("keeps only the known notes, trimmed and collapsed", () => {
    expect(
      parseSuggestionNotes({
        hours: "  Mon–Fri   9–5 \n Sat 10–2 ",
        address: " 1 High Street ",
        secret: "ignored",
      }),
    ).toEqual({ hours: "Mon–Fri 9–5 Sat 10–2", address: "1 High Street" });
  });

  it("limits length and drops blanks and non-text", () => {
    const notes = parseSuggestionNotes({
      hours: "x".repeat(suggestionLimits.hours + 50),
      address: "   ",
    });
    expect(notes.hours).toHaveLength(suggestionLimits.hours);
    expect(notes.address).toBeUndefined();
    expect(parseSuggestionNotes({ hours: 5 })).toEqual({});
    expect(parseSuggestionNotes(null)).toEqual({});
    expect(parseSuggestionNotes(["hours"])).toEqual({});
  });
});

describe("routesToOwner", () => {
  it("sends ordinary corrections to the owner and risky ones to admins only", () => {
    expect(routesToOwner("incorrect_details")).toBe(true);
    expect(routesToOwner("closed_or_moved")).toBe(true);
    expect(routesToOwner("other")).toBe(true);
    expect(routesToOwner("inappropriate_content")).toBe(false);
    expect(routesToOwner("duplicate_listing")).toBe(false);
    expect(routesToOwner(undefined)).toBe(false);
  });
});

describe("owner decisions", () => {
  it("recognises only the four decisions", () => {
    for (const value of ["apply", "handled", "decline", "escalate"]) {
      expect(isOwnerCorrectionDecision(value)).toBe(true);
    }
    expect(isOwnerCorrectionDecision("approve")).toBe(false);
    expect(isOwnerCorrectionDecision(undefined)).toBe(false);
  });

  it("offers apply only when there is something to apply", () => {
    expect(ownerCorrectionActions({ hasChanges: true })).toEqual([
      "apply",
      "handled",
      "decline",
      "escalate",
    ]);
    expect(ownerCorrectionActions({ hasChanges: false })).toEqual([
      "handled",
      "decline",
      "escalate",
    ]);
  });
});

describe("changedFields", () => {
  it("lists proposed fields in a fixed order and flags those that differ", () => {
    expect(
      changedFields(
        { summary: "New", publicPhone: "01234 567890", publicEmail: null },
        {
          publicPhone: "01234 567890",
          summary: "Old",
          publicEmail: "a@b.test",
        },
      ),
    ).toEqual([
      {
        key: "publicPhone",
        current: "01234 567890",
        proposed: "01234 567890",
        differs: false,
      },
      {
        key: "publicEmail",
        current: "a@b.test",
        proposed: null,
        differs: true,
      },
      { key: "summary", current: "Old", proposed: "New", differs: true },
    ]);
  });
});
