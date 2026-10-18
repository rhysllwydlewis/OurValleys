import { describe, expect, it } from "vitest";
import {
  boxStatuses,
  buildInboxHref,
  countsByBox,
  escapeLikePattern,
  INBOX_BULK_LIMIT,
  inboxBoxes,
  isBulkStatus,
  messageSnippet,
  needsAttention,
  parseInboxQuery,
  parseSelectedIds,
  replyTemplatesFor,
  senderInitials,
} from "./inbox-model";

const id = "00000000-0000-4000-8000-000000000501";
const businessId = "00000000-0000-4000-8000-000000000502";

describe("parseInboxQuery", () => {
  it("falls back to safe defaults for missing or hostile input", () => {
    expect(parseInboxQuery({})).toEqual({
      box: "inbox",
      kind: null,
      q: "",
      page: 1,
      enquiryId: null,
    });
    const hostile = parseInboxQuery({
      box: "../admin",
      kind: "<script>",
      page: "-4",
      enquiry: "not-a-uuid",
      q: "  a\n\n  b\t c  ",
    });
    expect(hostile).toMatchObject({
      box: "inbox",
      kind: null,
      page: 1,
      enquiryId: null,
      q: "a b c",
    });
  });

  it("accepts valid values and takes the first of a repeated parameter", () => {
    expect(
      parseInboxQuery({
        box: ["spam", "all"],
        kind: "quote",
        page: "3",
        enquiry: id,
      }),
    ).toMatchObject({ box: "spam", kind: "quote", page: 3, enquiryId: id });
  });

  it("shortens long searches and rejects absurd page numbers", () => {
    expect(parseInboxQuery({ q: "x".repeat(500) }).q).toHaveLength(80);
    expect(parseInboxQuery({ page: "99999999" }).page).toBe(1);
    expect(parseInboxQuery({ page: "2.5" }).page).toBe(1);
  });
});

describe("buildInboxHref", () => {
  const base = parseInboxQuery({});
  it("leaves defaults out", () => {
    expect(buildInboxHref(businessId, base)).toBe(
      `/dashboard/business/${businessId}/inbox`,
    );
  });
  it("round-trips a full query", () => {
    const query = parseInboxQuery({
      box: "done",
      kind: "callback",
      q: "boiler & flue",
      page: "2",
      enquiry: id,
    });
    const href = buildInboxHref(businessId, query);
    const url = new URL(href, "http://x.test");
    expect(parseInboxQuery(Object.fromEntries(url.searchParams))).toEqual(
      query,
    );
  });
  it("applies overrides without mutating the query", () => {
    const query = parseInboxQuery({ box: "spam", page: "4" });
    expect(buildInboxHref(businessId, query, { page: 1, box: "inbox" })).toBe(
      `/dashboard/business/${businessId}/inbox`,
    );
    expect(query.page).toBe(4);
  });
});

describe("mailboxes", () => {
  it("counts each status in the right boxes", () => {
    const counts = countsByBox({
      new: 2,
      read: 3,
      replied: 4,
      closed: 1,
      archived: 5,
      spam: 7,
    });
    expect(counts).toEqual({
      inbox: 5,
      unread: 2,
      replied: 4,
      done: 6,
      spam: 7,
      all: 22,
    });
  });
  it("keeps spam out of the to-do box", () => {
    expect(boxStatuses.inbox).not.toContain("spam");
    expect(inboxBoxes).toContain("all");
    expect(needsAttention("new")).toBe(true);
    expect(needsAttention("replied")).toBe(false);
  });
});

describe("bulk helpers", () => {
  it("never lets replied be set in bulk", () => {
    expect(isBulkStatus("replied")).toBe(false);
    expect(isBulkStatus("archived")).toBe(true);
    expect(isBulkStatus("deleted")).toBe(false);
  });
  it("dedupes, validates and caps posted ids", () => {
    expect(parseSelectedIds([id, id, "nope", 5, null])).toEqual([id]);
    const many = Array.from(
      { length: 200 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    expect(parseSelectedIds(many)).toHaveLength(INBOX_BULK_LIMIT);
  });
});

describe("display helpers", () => {
  it("escapes LIKE wildcards so search is literal", () => {
    expect(escapeLikePattern("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
  it("makes initials", () => {
    expect(senderInitials("Gwen Parry")).toBe("GP");
    expect(senderInitials("  ceri ")).toBe("C");
    expect(senderInitials("Ōzgür Çelik Yılmaz")).toBe("ŌÇ");
    expect(senderInitials("123 !!")).toBe("?");
    expect(senderInitials("")).toBe("?");
  });
  it("shortens snippets on one line", () => {
    expect(messageSnippet("a\n\nb   c")).toBe("a b c");
    const long = messageSnippet("word ".repeat(60), 40);
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith("…")).toBe(true);
  });
  it("offers kind-appropriate reply templates", () => {
    expect(replyTemplatesFor("quote")[0]).toBe("quote");
    expect(replyTemplatesFor("callback")[0]).toBe("callback");
    expect(replyTemplatesFor("enquiry")[0]).toBe("thanks");
  });
});
