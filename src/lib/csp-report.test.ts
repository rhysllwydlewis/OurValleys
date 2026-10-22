import { describe, expect, it } from "vitest";
import { formatCspReports } from "./csp-report";

const now = new Date("2026-10-20T10:00:00Z");

describe("formatCspReports", () => {
  it("reduces a legacy report to directive, blocked origin and page path", () => {
    const [line] = formatCspReports(
      {
        "csp-report": {
          "document-uri": "https://ourvalleys.test/b/cafe?token=secret",
          "effective-directive": "img-src",
          "blocked-uri": "http://cdn.example/pic.png?sig=abc",
          disposition: "report",
        },
      },
      now,
    );
    expect(line).toMatchObject({
      event: "csp_violation",
      directive: "img-src",
      blocked: "http://cdn.example",
      page: "/b/cafe",
    });
    expect(JSON.stringify(line)).not.toContain("secret");
    expect(JSON.stringify(line)).not.toContain("sig=abc");
  });

  it("keeps inline as inline and ignores Reporting API bodies", () => {
    const lines = formatCspReports(
      [
        {
          "csp-report": {
            "effective-directive": "script-src-elem",
            "blocked-uri": "inline",
            "document-uri": "https://ourvalleys.test/",
          },
        },
        {
          type: "csp-violation",
          body: { effectiveDirective: "img-src", blockedURL: "inline" },
        },
      ],
      now,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ blocked: "inline", page: "/" });
  });

  it("ignores junk and caps the number of entries", () => {
    expect(formatCspReports("nope", now)).toEqual([]);
    expect(formatCspReports(null, now)).toEqual([]);
    expect(formatCspReports({ "csp-report": {} }, now)).toEqual([]);
    const many = Array.from({ length: 30 }, () => ({
      "csp-report": { "violated-directive": "img-src" },
    }));
    expect(formatCspReports(many, now)).toHaveLength(10);
  });

  it("drops free-text directives and normalises the disposition", () => {
    const lines = formatCspReports({
      "csp-report": {
        "effective-directive": "img-src",
        disposition: "anything the sender likes",
      },
    });
    expect(lines[0]?.disposition).toBe("report");
    expect(
      formatCspReports({
        "csp-report": { "effective-directive": "IMG_SRC!" },
      }),
    ).toEqual([]);
  });
});
