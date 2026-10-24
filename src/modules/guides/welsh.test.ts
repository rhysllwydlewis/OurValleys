import { describe, expect, it } from "vitest";
import type { GuideSection } from "./shared";
import {
  alignWelshSections,
  applyWelshGuide,
  assessWelshGuide,
  guideContentLang,
  welshGuideFieldsSchema,
  type TranslatableGuide,
  type WelshGuideFields,
} from "./welsh";

const sections: GuideSection[] = [
  {
    id: "a1",
    kind: "text",
    heading: "Start here",
    body: "Walk the high street end to end.",
    href: "/businesses",
    linkLabel: "Search businesses",
  },
  {
    id: "b2",
    kind: "tip",
    heading: "Ask for the house blend",
    body: "Most cafés have one they are proud of.",
    href: "",
    linkLabel: "",
  },
];

const english: TranslatableGuide = {
  title: "Coffee across the Valleys",
  summary: "An afternoon out in three cafés.",
  areaLabel: "Across Rhondda Cynon Taf",
  readingTime: "4 minute read",
  sponsorshipDisclosure: null,
  sections,
};

const welsh: WelshGuideFields = {
  title: "Coffi ar draws y Cymoedd",
  summary: "Prynhawn allan mewn tair caffi.",
  areaLabel: "Ar draws Rhondda Cynon Taf",
  readingTime: "Darlleniad 4 munud",
  sponsorshipDisclosure: "",
  sections: [
    {
      id: "a1",
      heading: "Dechreuwch yma",
      body: "Cerddwch y stryd fawr.",
      linkLabel: "Chwilio busnesau",
    },
    {
      id: "b2",
      heading: "Gofynnwch",
      body: "Mae gan bob caffi un.",
      linkLabel: "",
    },
  ],
};

describe("assessWelshGuide", () => {
  it("is complete when every English field has Welsh", () => {
    const result = assessWelshGuide(english, welsh);
    expect(result.complete).toBe(true);
    expect(result.done).toBe(result.total);
    // title, summary, area, reading time, 2 headings, 2 bodies, 1 link
    expect(result.total).toBe(9);
  });

  it("lists what is missing, by section", () => {
    const partial: WelshGuideFields = {
      ...welsh,
      summary: "   ",
      sections: [{ ...welsh.sections[0]!, linkLabel: "" }, welsh.sections[1]!],
    };
    const result = assessWelshGuide(english, partial);
    expect(result.complete).toBe(false);
    expect(result.missing.map((field) => field.key)).toEqual([
      "summary",
      "sections.a1.linkLabel",
    ]);
  });

  it("treats no Welsh at all as nothing done", () => {
    const result = assessWelshGuide(english, null);
    expect(result.done).toBe(0);
    expect(result.complete).toBe(false);
  });

  it("requires a sponsorship line only when the English has one", () => {
    expect(assessWelshGuide(english, welsh).complete).toBe(true);
    const sponsored = { ...english, sponsorshipDisclosure: "Paid for by X." };
    const result = assessWelshGuide(sponsored, welsh);
    expect(result.complete).toBe(false);
    expect(result.missing[0]?.key).toBe("sponsorshipDisclosure");
  });

  it("is incomplete again when the English gains a section", () => {
    const grown = {
      ...english,
      sections: [
        ...sections,
        {
          ...sections[1]!,
          id: "c3",
          heading: "One more",
          body: "More text here.",
        },
      ],
    };
    const result = assessWelshGuide(grown, welsh);
    expect(result.complete).toBe(false);
    expect(result.missing.map((field) => field.key)).toEqual([
      "sections.c3.heading",
      "sections.c3.body",
    ]);
  });

  it("ignores Welsh for a section the English no longer has", () => {
    const shrunk = { ...english, sections: [sections[0]!] };
    expect(assessWelshGuide(shrunk, welsh).complete).toBe(true);
  });
});

describe("applyWelshGuide", () => {
  it("returns null until the Welsh is complete", () => {
    expect(applyWelshGuide(english, null)).toBeNull();
    expect(applyWelshGuide(english, { ...welsh, title: "" })).toBeNull();
  });

  it("swaps the text but keeps links, kinds and ids from the English", () => {
    const result = applyWelshGuide(english, welsh);
    expect(result?.title).toBe("Coffi ar draws y Cymoedd");
    expect(result?.sections.map((section) => section.id)).toEqual(["a1", "b2"]);
    expect(result?.sections[0]).toMatchObject({
      heading: "Dechreuwch yma",
      href: "/businesses",
      linkLabel: "Chwilio busnesau",
      kind: "text",
    });
    expect(result?.sections[1]).toMatchObject({ kind: "tip", href: "" });
  });

  it("pairs by id, not position, when the English is reordered", () => {
    const reordered = { ...english, sections: [sections[1]!, sections[0]!] };
    const result = applyWelshGuide(reordered, welsh);
    expect(result?.sections[0]?.heading).toBe("Gofynnwch");
    expect(result?.sections[1]?.heading).toBe("Dechreuwch yma");
  });

  it("never shows a Welsh sponsorship line the English does not have", () => {
    const result = applyWelshGuide(english, {
      ...welsh,
      sponsorshipDisclosure: "Noddir gan X.",
    });
    expect(result?.sponsorshipDisclosure).toBeNull();
  });
});

describe("alignWelshSections", () => {
  it("returns one entry per English section in English order, dropping orphans", () => {
    const aligned = alignWelshSections(sections, [
      { id: "zz", heading: "Orphan", body: "x", linkLabel: "" },
      welsh.sections[1]!,
    ]);
    expect(aligned.map((section) => section.id)).toEqual(["a1", "b2"]);
    expect(aligned[0]?.heading).toBe("");
    expect(aligned[1]?.heading).toBe("Gofynnwch");
  });
});

describe("welshGuideFieldsSchema", () => {
  it("trims and defaults", () => {
    const parsed = welshGuideFieldsSchema.parse({ title: "  Teitl  " });
    expect(parsed.title).toBe("Teitl");
    expect(parsed.sections).toEqual([]);
  });

  it("rejects over-long fields and bad section ids", () => {
    expect(
      welshGuideFieldsSchema.safeParse({ title: "x".repeat(161) }).success,
    ).toBe(false);
    expect(
      welshGuideFieldsSchema.safeParse({
        sections: [{ id: "Bad Id!", heading: "", body: "", linkLabel: "" }],
      }).success,
    ).toBe(false);
  });
});

describe("guideContentLang", () => {
  it("maps the content locale to a language tag", () => {
    expect(guideContentLang("cy")).toBe("cy");
    expect(guideContentLang("en")).toBe("en-GB");
  });
});
