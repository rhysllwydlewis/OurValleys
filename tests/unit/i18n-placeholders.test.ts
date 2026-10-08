import { describe, expect, it } from "vitest";
import { cy } from "@/lib/i18n/messages/cy";
import { en } from "@/lib/i18n/messages/en";

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort();
}

describe("message catalogues", () => {
  it("have the same keys in English and Welsh", () => {
    expect(Object.keys(cy).sort()).toEqual(Object.keys(en).sort());
  });

  it("use the same placeholders in English and Welsh", () => {
    const mismatched = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => placeholders(en[key]).join() !== placeholders(cy[key]).join(),
    );
    expect(mismatched).toEqual([]);
  });

  it("have no empty messages", () => {
    for (const catalogue of [en, cy] as Record<string, string>[]) {
      for (const [key, message] of Object.entries(catalogue)) {
        expect(message.trim(), key).not.toBe("");
      }
    }
  });
});
