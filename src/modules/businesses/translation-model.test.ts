import { describe, expect, it } from "vitest";
import {
  applyWelshOverlay,
  cleanTranslationText,
  emptyTranslation,
  parseTranslationForm,
  serviceFieldName,
  translationLimits,
  welshCoverage,
  type BusinessTranslationText,
} from "@/modules/businesses/translation-model";

const serviceA = "00000000-0000-4000-8000-0000000000a1";
const serviceB = "00000000-0000-4000-8000-0000000000b2";

describe("cleanTranslationText", () => {
  it("treats blank text as 'use the English'", () => {
    expect(cleanTranslationText("   \n ", 10, { multiline: true })).toEqual({
      ok: true,
      value: null,
    });
    expect(cleanTranslationText(undefined, 10, { multiline: false })).toEqual({
      ok: true,
      value: null,
    });
    expect(cleanTranslationText(42, 10, { multiline: false })).toEqual({
      ok: true,
      value: null,
    });
  });

  it("collapses whitespace on one line and keeps paragraphs in long text", () => {
    expect(
      cleanTranslationText("  Gwasanaeth \n  boeleri  ", 50, {
        multiline: false,
      }),
    ).toEqual({ ok: true, value: "Gwasanaeth boeleri" });
    expect(
      cleanTranslationText("Un\r\n\r\n\r\n\r\nDau  \n", 50, {
        multiline: true,
      }),
    ).toEqual({ ok: true, value: "Un\n\nDau" });
  });

  it("removes control characters and keeps Welsh letters intact", () => {
    const result = cleanTranslationText("Tŷ\u0000 gwyn â’r ŵy ŵ\u0007", 50, {
      multiline: false,
    });
    expect(result).toEqual({ ok: true, value: "Tŷ gwyn â’r ŵy ŵ" });
  });

  it("counts characters, not UTF-16 units, and refuses rather than truncates", () => {
    expect(cleanTranslationText("ŷŷŷ", 3, { multiline: false }).ok).toBe(true);
    expect(cleanTranslationText("ŷŷŷŷ", 3, { multiline: false })).toEqual({
      ok: false,
      reason: "too-long",
      max: 3,
    });
    // Astral characters are one character each.
    expect(cleanTranslationText("😀😀", 2, { multiline: false }).ok).toBe(true);
  });
});

describe("parseTranslationForm", () => {
  const form = (fields: Record<string, string>) => (name: string) =>
    fields[name];

  it("reads the summary, description and the business's own services", () => {
    const parsed = parseTranslationForm(
      form({
        summary: " Crynodeb byr ",
        description: "",
        [serviceFieldName(serviceA, "name")]: "Gwasanaeth boeler",
        [serviceFieldName(serviceA, "description")]: "",
      }),
      [serviceA],
    );
    expect(parsed).toEqual({
      ok: true,
      value: {
        summary: "Crynodeb byr",
        description: null,
        services: {
          [serviceA]: { name: "Gwasanaeth boeler", description: null },
        },
      },
    });
  });

  it("ignores fields for service ids that are not the business's own", () => {
    const parsed = parseTranslationForm(
      form({ [serviceFieldName(serviceB, "name")]: "Ymosodiad" }),
      [serviceA],
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok)
      expect(Object.keys(parsed.value.services)).toEqual([serviceA]);
  });

  it("reports every too-long field and returns nothing to save", () => {
    const parsed = parseTranslationForm(
      form({
        summary: "a".repeat(translationLimits.summary + 1),
        [serviceFieldName(serviceA, "name")]: "b".repeat(
          translationLimits.serviceName + 1,
        ),
        [serviceFieldName(serviceA, "description")]: "ok",
      }),
      [serviceA],
    );
    expect(parsed).toEqual({
      ok: false,
      errors: {
        summary: "too-long",
        services: { [serviceA]: { name: "too-long" } },
      },
    });
  });
});

describe("applyWelshOverlay", () => {
  const source = {
    summary: "Boiler repairs",
    description: "Long English text",
    services: [
      { name: "Boiler service", description: "Yearly check" },
      { name: "Leak repair", description: null },
    ],
  };
  const ids = new Map([
    ["Boiler service", serviceA],
    ["Leak repair", serviceB],
  ]);

  it("returns the English record untouched when there is no Welsh", () => {
    const { value, welsh } = applyWelshOverlay(source, emptyTranslation, ids);
    expect(value).toEqual(source);
    expect(welsh).toEqual({
      summary: false,
      description: false,
      serviceNames: [false, false],
      serviceDescriptions: [false, false],
    });
  });

  it("replaces only the fields that have Welsh and flags exactly those", () => {
    const translation: BusinessTranslationText = {
      summary: "Atgyweirio boeleri",
      description: null,
      services: {
        [serviceA]: { name: "Gwasanaeth boeler", description: null },
        [serviceB]: { name: null, description: "Trwsio gollyngiad" },
      },
      updatedAt: null,
    };
    const { value, welsh } = applyWelshOverlay(source, translation, ids);
    expect(value.summary).toBe("Atgyweirio boeleri");
    expect(value.description).toBe("Long English text");
    expect(value.services).toEqual([
      { name: "Gwasanaeth boeler", description: "Yearly check" },
      { name: "Leak repair", description: "Trwsio gollyngiad" },
    ]);
    expect(welsh).toEqual({
      summary: true,
      description: false,
      serviceNames: [true, false],
      serviceDescriptions: [false, true],
    });
  });

  it("does not translate a service whose id is unknown", () => {
    const translation: BusinessTranslationText = {
      ...emptyTranslation,
      services: { [serviceA]: { name: "Gwasanaeth", description: null } },
    };
    const { value } = applyWelshOverlay(source, translation, new Map());
    expect(value.services[0]!.name).toBe("Boiler service");
  });

  it("does not mutate its input", () => {
    const copy = structuredClone(source);
    applyWelshOverlay(source, { ...emptyTranslation, summary: "Cymraeg" }, ids);
    expect(source).toEqual(copy);
  });
});

describe("welshCoverage", () => {
  const english = {
    summary: "Boiler repairs",
    description: "",
    services: [
      { id: serviceA, name: "Boiler service", description: "Yearly check" },
      { id: serviceB, name: "Reiki", description: null },
    ],
  };

  it("counts only what the English record has", () => {
    const coverage = welshCoverage(english, emptyTranslation);
    expect(coverage.items.map((item) => item.key)).toEqual([
      "summary",
      `service-${serviceA}`,
      `service-${serviceB}`,
    ]);
    expect(coverage).toMatchObject({
      done: 0,
      total: 3,
      percent: 0,
      state: "none",
    });
  });

  it("needs a described service's description, but lets a plain name stay", () => {
    const partial = welshCoverage(english, {
      ...emptyTranslation,
      summary: "Cymraeg",
      services: {
        [serviceA]: { name: "Gwasanaeth", description: null },
        [serviceB]: { name: null, description: "Cymraeg" },
      },
    });
    expect(partial.items.map((item) => item.done)).toEqual([true, false, true]);
    expect(partial.state).toBe("partial");
    expect(partial.percent).toBe(67);

    const complete = welshCoverage(english, {
      ...emptyTranslation,
      summary: "Cymraeg",
      services: {
        [serviceA]: { name: null, description: "Archwiliad blynyddol" },
        [serviceB]: { name: "Reiki", description: null },
      },
    });
    expect(complete.state).toBe("complete");
    expect(complete.percent).toBe(100);
  });

  it("is 'none' with zero total for an empty English record", () => {
    expect(
      welshCoverage(
        { summary: "", description: null, services: [] },
        emptyTranslation,
      ),
    ).toMatchObject({ total: 0, percent: 0, state: "none" });
  });
});
