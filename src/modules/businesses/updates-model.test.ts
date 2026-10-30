import { describe, expect, it } from "vitest";
import {
  bodyParagraphs,
  cleanUpdateText,
  groupUpdates,
  hasWelshVersion,
  isRecentUpdate,
  isUpdateIntent,
  parseUpdateForm,
  scheduleBounds,
  readUpdateValues,
  updateExcerpt,
  updateGuidance,
  updateLimits,
  type StudioUpdate,
} from "./updates-model";
import {
  hasUpdateFilters,
  parseUpdateFilters,
  updateHref,
} from "./update-filters";

const valid = {
  title: "Closed on Monday",
  body: "We are closed on Monday for a staff training day.",
  titleCy: "",
  bodyCy: "",
  publishAt: "",
};

function studio(overrides: Partial<StudioUpdate> = {}): StudioUpdate {
  return {
    id: "u1",
    title: "Closed on Monday",
    body: "We are closed on Monday for a staff training day. Back as normal on Tuesday morning at nine.",
    titleCy: null,
    bodyCy: null,
    status: "draft",
    publishedAt: null,
    scheduledFor: null,
    image: null,
    updatedAt: new Date("2026-03-01T10:00:00Z"),
    ...overrides,
  };
}

describe("cleanUpdateText", () => {
  it("normalises line endings, strips control characters and tidies blank lines", () => {
    expect(cleanUpdateText("  a\r\nb\u0007  \n\n\n\nc​  ")).toBe("a\nb\n\nc");
  });

  it("keeps ordinary punctuation, Welsh letters and emoji", () => {
    expect(cleanUpdateText("Croeso i’r Rhondda ŵ ô 🎉")).toBe(
      "Croeso i’r Rhondda ŵ ô 🎉",
    );
  });
});

describe("bodyParagraphs and updateExcerpt", () => {
  it("splits on blank lines and drops empties", () => {
    expect(bodyParagraphs("One\n\n\n\nTwo\nstill two\n\n")).toEqual([
      "One",
      "Two\nstill two",
    ]);
  });

  it("shortens at a word boundary with an ellipsis", () => {
    const excerpt = updateExcerpt(`${"word ".repeat(60)}end`, 50);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(50);
    expect(excerpt).not.toMatch(/wor…$/);
  });

  it("leaves a short first paragraph alone and flattens its lines", () => {
    expect(updateExcerpt("Hello\nthere\n\nSecond")).toBe("Hello there");
  });
});

describe("parseUpdateForm", () => {
  it("accepts a valid English-only update", () => {
    const parsed = parseUpdateForm(valid);
    expect(parsed).toEqual({
      ok: true,
      update: {
        title: valid.title,
        body: valid.body,
        titleCy: null,
        bodyCy: null,
        scheduledFor: null,
      },
    });
  });

  it("flags short and long fields individually", () => {
    const parsed = parseUpdateForm({
      ...valid,
      title: "ab",
      body: "x".repeat(updateLimits.bodyMax + 1),
    });
    expect(parsed).toEqual({
      ok: false,
      errors: { title: "titleShort", body: "bodyLong" },
    });
  });

  it("flattens a title typed over several lines", () => {
    const parsed = parseUpdateForm({ ...valid, title: "Line one\nline two" });
    expect(parsed.ok && parsed.update.title).toBe("Line one line two");
  });

  it("makes Welsh all-or-nothing", () => {
    expect(parseUpdateForm({ ...valid, titleCy: "Pennawd" })).toEqual({
      ok: false,
      errors: { bodyCy: "welshBodyMissing" },
    });
    expect(parseUpdateForm({ ...valid, bodyCy: "Testun Cymraeg yma" })).toEqual(
      { ok: false, errors: { titleCy: "welshTitleMissing" } },
    );
    const both = parseUpdateForm({
      ...valid,
      titleCy: "Ar gau ddydd Llun",
      bodyCy: "Rydym ar gau ddydd Llun.",
    });
    expect(both.ok && both.update.titleCy).toBe("Ar gau ddydd Llun");
  });

  it("treats whitespace-only Welsh as absent", () => {
    const parsed = parseUpdateForm({ ...valid, titleCy: "  ", bodyCy: "\n " });
    expect(parsed.ok && parsed.update.titleCy).toBeNull();
  });

  it("leaves markup as plain text rather than interpreting it", () => {
    const parsed = parseUpdateForm({
      ...valid,
      body: "<script>alert(1)</script> hello there",
    });
    expect(parsed.ok && parsed.update.body).toBe(
      "<script>alert(1)</script> hello there",
    );
  });
});

describe("form plumbing", () => {
  it("reads missing and non-string fields as empty strings", () => {
    expect(
      readUpdateValues((name) => (name === "title" ? "Hi" : new Blob([]))),
    ).toEqual({
      title: "Hi",
      body: "",
      titleCy: "",
      bodyCy: "",
      publishAt: "",
    });
  });

  it("accepts only the two intents", () => {
    expect(isUpdateIntent("save")).toBe(true);
    expect(isUpdateIntent("publish")).toBe(true);
    expect(isUpdateIntent("delete")).toBe(false);
    expect(isUpdateIntent(null)).toBe(false);
  });
});

describe("Welsh and recency", () => {
  it("needs both Welsh fields", () => {
    expect(hasWelshVersion({ titleCy: "a", bodyCy: "b" })).toBe(true);
    expect(hasWelshVersion({ titleCy: "a", bodyCy: null })).toBe(false);
    expect(hasWelshVersion({ titleCy: " ", bodyCy: "b" })).toBe(false);
  });

  it("calls an update stale after the cut-off", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    expect(isRecentUpdate(new Date("2026-09-01T00:00:00Z"), now)).toBe(true);
    expect(isRecentUpdate(new Date("2025-01-01T00:00:00Z"), now)).toBe(false);
    expect(isRecentUpdate(null, now)).toBe(false);
  });
});

describe("updateGuidance", () => {
  it("says a complete draft is ready", () => {
    expect(updateGuidance(studio()).map((g) => g.code)).toEqual(["draftReady"]);
  });

  it("asks a published update for Welsh and warns about a half-written one", () => {
    expect(
      updateGuidance(studio({ status: "published" })).map((g) => g.code),
    ).toContain("welshMissing");
    expect(
      updateGuidance(studio({ titleCy: "Pennawd" })).map((g) => g.code),
    ).toContain("welshHalf");
  });

  it("nudges a very short body", () => {
    expect(
      updateGuidance(studio({ body: "Closed Monday, sorry." })).map(
        (g) => g.code,
      ),
    ).toContain("shortBody");
  });
});

describe("groupUpdates and a removed update", () => {
  it("keeps removed updates out of published and drafts", () => {
    const groups = groupUpdates([
      studio({
        id: "p",
        status: "published",
        publishedAt: new Date("2026-01-01"),
      }),
      studio({ id: "d" }),
      studio({ id: "r", status: "removed", updatedAt: new Date("2026-05-01") }),
    ]);
    expect(groups.published.map((u) => u.id)).toEqual(["p"]);
    expect(groups.drafts.map((u) => u.id)).toEqual(["d"]);
    expect(groups.removed.map((u) => u.id)).toEqual(["r"]);
  });
});

describe("groupUpdates", () => {
  it("orders published newest first and drafts by last edit", () => {
    const groups = groupUpdates([
      studio({
        id: "old",
        status: "published",
        publishedAt: new Date("2026-01-01"),
      }),
      studio({
        id: "new",
        status: "published",
        publishedAt: new Date("2026-02-01"),
      }),
      studio({ id: "d1", updatedAt: new Date("2026-03-01") }),
      studio({ id: "d2", updatedAt: new Date("2026-04-01") }),
    ]);
    expect(groups.published.map((u) => u.id)).toEqual(["new", "old"]);
    expect(groups.drafts.map((u) => u.id)).toEqual(["d2", "d1"]);
  });
});

describe("update filters", () => {
  it("normalises untrusted query values", () => {
    const filters = parseUpdateFilters({
      q: ["  roadworks  ", "ignored"],
      place: "x".repeat(200),
      page: "-3",
    });
    expect(filters.q).toBe("roadworks");
    expect(filters.place).toHaveLength(80);
    expect(filters.page).toBe(1);
  });

  it("builds short URLs and keeps other filters when one changes", () => {
    const filters = parseUpdateFilters({ q: "menu", place: "aberdare" });
    expect(updateHref(filters, { page: 2 })).toBe(
      "/updates?q=menu&place=aberdare&page=2",
    );
    expect(updateHref(filters, { q: "", place: "", page: 1 })).toBe("/updates");
    expect(hasUpdateFilters(filters)).toBe(true);
    expect(hasUpdateFilters(parseUpdateFilters({}))).toBe(false);
  });
});

describe("scheduling", () => {
  const now = new Date("2026-06-01T10:00:00Z");

  it("bounds a schedule between the minimum lead and the maximum horizon", () => {
    const { earliest, latest } = scheduleBounds(now);
    expect(earliest.getTime() - now.getTime()).toBe(
      updateLimits.scheduleMinMinutes * 60_000,
    );
    expect(latest.getTime() - now.getTime()).toBe(
      updateLimits.scheduleMaxDays * 86_400_000,
    );
  });

  it("reads a UK summer time as one hour behind UTC", () => {
    const parsed = parseUpdateForm(
      { ...valid, publishAt: "2026-06-10T09:30" },
      { intent: "schedule", now },
    );
    expect(parsed.ok && parsed.update.scheduledFor?.toISOString()).toBe(
      "2026-06-10T08:30:00.000Z",
    );
  });

  it("needs a time to schedule", () => {
    const parsed = parseUpdateForm(valid, { intent: "schedule", now });
    expect(parsed).toEqual({
      ok: false,
      errors: { publishAt: "publishAtMissing" },
    });
  });

  it("refuses an impossible, too-soon or too-far time", () => {
    const code = (publishAt: string) => {
      const parsed = parseUpdateForm(
        { ...valid, publishAt },
        { intent: "schedule", now },
      );
      return parsed.ok ? "ok" : parsed.errors.publishAt;
    };
    expect(code("2026-02-30T10:00")).toBe("publishAtInvalid");
    expect(code("tomorrow")).toBe("publishAtInvalid");
    expect(code("2026-06-01T11:05")).toBe("publishAtSoon");
    expect(code("2026-05-01T10:00")).toBe("publishAtSoon");
    expect(code("2027-06-01T10:00")).toBe("publishAtFar");
    expect(code("2026-06-02T10:00")).toBe("ok");
  });

  it("ignores the time unless the update is being scheduled", () => {
    const draft = parseUpdateForm(
      { ...valid, publishAt: "garbage" },
      { intent: "save", now },
    );
    expect(draft.ok && draft.update.scheduledFor).toBe(null);
    const publish = parseUpdateForm(
      { ...valid, publishAt: "garbage" },
      { intent: "publish", now },
    );
    expect(publish.ok).toBe(true);
  });

  it("checks the time when an already scheduled update is saved", () => {
    const parsed = parseUpdateForm(
      { ...valid, publishAt: "2026-06-01T10:05" },
      { intent: "save", wasScheduled: true, now },
    );
    expect(parsed).toEqual({
      ok: false,
      errors: { publishAt: "publishAtSoon" },
    });
  });

  it("accepts the schedule intent and groups scheduled updates soonest first", () => {
    expect(isUpdateIntent("schedule")).toBe(true);
    const later = studio({
      id: "later",
      status: "scheduled",
      scheduledFor: new Date("2026-07-02T09:00:00Z"),
    });
    const sooner = studio({
      id: "sooner",
      status: "scheduled",
      scheduledFor: new Date("2026-07-01T09:00:00Z"),
    });
    const groups = groupUpdates([later, studio(), sooner]);
    expect(groups.scheduled.map((u) => u.id)).toEqual(["sooner", "later"]);
    expect(groups.drafts).toHaveLength(1);
  });
});
