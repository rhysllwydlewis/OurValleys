import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/messages/en";
import { cy } from "@/lib/i18n/messages/cy";
import { groups, tabs } from "./dashboard-nav-model";

describe("business dashboard navigation groups", () => {
  it("places every section in exactly one group", () => {
    const grouped = groups.flatMap((group) => group.tabs);
    expect([...grouped].sort()).toEqual(tabs.map((tab) => tab.key).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("starts with the overview on its own, without a heading", () => {
    expect(groups[0]).toMatchObject({ label: null, tabs: ["overview"] });
  });

  it("gives every other group a heading in English and Welsh", () => {
    for (const group of groups.slice(1)) {
      expect(group.label).not.toBeNull();
      const key = group.label!;
      expect(en[key]).toBeTruthy();
      expect(cy[key]).toBeTruthy();
      expect(cy[key]).not.toBe(en[key]);
    }
  });

  it("keys group ids uniquely so their headings label the right list", () => {
    const keys = groups.map((group) => group.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
