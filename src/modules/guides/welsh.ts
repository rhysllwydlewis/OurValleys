import { z } from "zod";
import type { GuideSection } from "./shared";

/**
 * Welsh versions of guides. An admin writes the Welsh beside the English; a
 * Welsh reader sees it only once every field that the English guide has is
 * translated, so a page is never half English and half Welsh. Sections are
 * paired by their stable id, so reordering the English cannot misplace text.
 * Links and section kinds always come from the English guide.
 */

export const welshSectionSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,24}$/),
  heading: z.string().trim().max(120).default(""),
  body: z.string().trim().max(2000).default(""),
  linkLabel: z.string().trim().max(100).default(""),
});

export const welshGuideFieldsSchema = z.object({
  title: z.string().trim().max(160).default(""),
  summary: z.string().trim().max(500).default(""),
  areaLabel: z.string().trim().max(120).default(""),
  readingTime: z.string().trim().max(60).default(""),
  sponsorshipDisclosure: z.string().trim().max(300).default(""),
  sections: z.array(welshSectionSchema).max(12).default([]),
});

export type WelshGuideSection = z.infer<typeof welshSectionSchema>;
export type WelshGuideFields = z.infer<typeof welshGuideFieldsSchema>;

/** The English fields a Welsh version has to cover. */
export type TranslatableGuide = {
  title: string;
  summary: string;
  areaLabel: string;
  readingTime: string;
  sponsorshipDisclosure: string | null;
  sections: readonly GuideSection[];
};

export type WelshMissingField = {
  /** A stable key: `title`, `sections.<id>.heading`, … */
  key: string;
  label: string;
};

export type WelshProgress = {
  total: number;
  done: number;
  complete: boolean;
  missing: WelshMissingField[];
};

/** Sections are stored as jsonb; re-validate on the way out. */
export function parseStoredWelsh(row: {
  title: string;
  summary: string;
  areaLabel: string;
  readingTime: string;
  sponsorshipDisclosure: string;
  sections: unknown;
}): WelshGuideFields {
  const sections = z.array(welshSectionSchema).safeParse(row.sections);
  return {
    title: row.title,
    summary: row.summary,
    areaLabel: row.areaLabel,
    readingTime: row.readingTime,
    sponsorshipDisclosure: row.sponsorshipDisclosure,
    sections: sections.success ? sections.data : [],
  };
}

export function emptyWelshGuide(): WelshGuideFields {
  return {
    title: "",
    summary: "",
    areaLabel: "",
    readingTime: "",
    sponsorshipDisclosure: "",
    sections: [],
  };
}

function filled(value: string | undefined): boolean {
  return (value ?? "").trim().length > 0;
}

/**
 * What is translated and what is still missing. Optional English fields (the
 * sponsorship line, a section's link wording) only need Welsh when the English
 * guide has them; Welsh left over for fields the English no longer has is
 * ignored.
 */
export function assessWelshGuide(
  english: TranslatableGuide,
  welsh: WelshGuideFields | null,
): WelshProgress {
  const required: { key: string; label: string; done: boolean }[] = [];
  const add = (key: string, label: string, value: string | undefined) =>
    required.push({ key, label, done: filled(value) });

  add("title", "Title", welsh?.title);
  add("summary", "Summary", welsh?.summary);
  add("areaLabel", "Area label", welsh?.areaLabel);
  add("readingTime", "Reading time", welsh?.readingTime);
  if (english.sponsorshipDisclosure) {
    add(
      "sponsorshipDisclosure",
      "Sponsorship disclosure",
      welsh?.sponsorshipDisclosure,
    );
  }
  english.sections.forEach((section, index) => {
    const welshSection = welsh?.sections.find((item) => item.id === section.id);
    const name = `Section ${index + 1}`;
    add(
      `sections.${section.id}.heading`,
      `${name} heading`,
      welshSection?.heading,
    );
    add(`sections.${section.id}.body`, `${name} text`, welshSection?.body);
    if (section.href && section.linkLabel) {
      add(
        `sections.${section.id}.linkLabel`,
        `${name} link wording`,
        welshSection?.linkLabel,
      );
    }
  });

  const missing = required
    .filter((field) => !field.done)
    .map(({ key, label }) => ({ key, label }));
  return {
    total: required.length,
    done: required.length - missing.length,
    complete: missing.length === 0,
    missing,
  };
}

export type WelshGuideText = {
  title: string;
  summary: string;
  areaLabel: string;
  readingTime: string;
  sponsorshipDisclosure: string | null;
  sections: GuideSection[];
};

/**
 * The guide in Welsh, or null when the Welsh version is missing or not yet
 * complete (the reader then gets the English guide). Links, section kinds and
 * ids stay as in the English.
 */
export function applyWelshGuide(
  english: TranslatableGuide,
  welsh: WelshGuideFields | null | undefined,
): WelshGuideText | null {
  if (!welsh || !assessWelshGuide(english, welsh).complete) return null;
  return {
    title: welsh.title,
    summary: welsh.summary,
    areaLabel: welsh.areaLabel,
    readingTime: welsh.readingTime,
    sponsorshipDisclosure: english.sponsorshipDisclosure
      ? welsh.sponsorshipDisclosure
      : null,
    sections: english.sections.map((section) => {
      const translated = welsh.sections.find((item) => item.id === section.id);
      return {
        ...section,
        heading: translated?.heading ?? section.heading,
        body: translated?.body ?? section.body,
        linkLabel:
          section.href && section.linkLabel
            ? (translated?.linkLabel ?? section.linkLabel)
            : section.linkLabel,
      };
    }),
  };
}

/**
 * Keeps only Welsh sections that still pair with an English one, in English
 * order, so a section removed from the English leaves no orphan text behind.
 */
export function alignWelshSections(
  english: readonly GuideSection[],
  sections: readonly WelshGuideSection[],
): WelshGuideSection[] {
  return english.map((section) => {
    const found = sections.find((item) => item.id === section.id);
    return {
      id: section.id,
      heading: found?.heading ?? "",
      body: found?.body ?? "",
      linkLabel: found?.linkLabel ?? "",
    };
  });
}

/** The `lang` attribute for text taken from a guide. */
export function guideContentLang(contentLocale: "en" | "cy"): string {
  return contentLocale === "cy" ? "cy" : "en-GB";
}
