import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getMessages } from "@/lib/i18n/translate";

const keys = [
  "offline.eyebrow",
  "offline.title",
  "offline.body",
  "offline.retry",
] as const;

describe("offline fallback", () => {
  it("has English and Welsh copy", () => {
    for (const locale of ["en", "cy"] as const) {
      const messages = getMessages(locale) as Record<string, string>;
      for (const key of keys) expect(messages[key]).toBeTruthy();
    }
  });

  it("service worker precaches /offline and its message script, and answers navigations", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    expect(sw).toContain('"/offline"');
    expect(sw).toContain('request.mode !== "navigate"');
    // The offline page and the one script it refers to; no page content.
    expect(sw.match(/cache\.add\(/g)).toHaveLength(2);
    expect(sw.match(/cache\.put\(/g)).toHaveLength(1);
    expect(sw).toContain("immutable");
  });
});
