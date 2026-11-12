import { describe, expect, it } from "vitest";
import { cy } from "@/lib/i18n/messages/cy";
import { en } from "@/lib/i18n/messages/en";
import { accountNavGroups } from "./account-nav-model";

describe("account navigation", () => {
  const items = accountNavGroups.flatMap((group) => group.items);

  it("links each account page once, all under /account", () => {
    const keys = items.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual([
      "following",
      "home",
      "notifications",
      "privacy",
      "saved",
      "settings",
    ]);
    for (const item of items) {
      expect(
        item.href === "/account" || item.href.startsWith("/account/"),
      ).toBe(true);
    }
  });

  it("has English and Welsh text for every label and heading", () => {
    const keys = [
      ...items.map((item) => item.label),
      ...accountNavGroups.flatMap((group) =>
        group.label ? [group.label] : [],
      ),
    ];
    for (const key of keys) {
      expect(en[key]).toBeTruthy();
      expect(cy[key]).toBeTruthy();
    }
  });
});
