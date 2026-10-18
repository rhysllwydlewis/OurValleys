import { describe, expect, it } from "vitest";
import {
  applyEventWelshOverlay,
  applyMenuWelshOverlay,
  applyOfferWelshOverlay,
  entryFieldName,
  entryLimits,
  applyWelshOverlay,
  cleanTranslationText,
  emptyTranslation,
  offerFieldName,
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
        events: {},
        menuGroups: {},
        menuItems: {},
        summary: "Crynodeb byr",
        description: null,
        services: {
          [serviceA]: { name: "Gwasanaeth boeler", description: null },
        },
        offers: {},
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
        entries: {},
        offers: {},
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
      offers: {},
      events: {},
      menuGroups: {},
      menuItems: {},
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

describe("Welsh offers", () => {
  const offerA = "00000000-0000-4000-8000-0000000000c1";
  const offerB = "00000000-0000-4000-8000-0000000000d2";

  it("reads only the offer ids it is given and cleans each field", () => {
    const fields: Record<string, string> = {
      [offerFieldName(offerA, "title")]: "  Gostyngiad   gaeaf ",
      [offerFieldName(offerA, "description")]: "Deg y cant i ffwrdd",
      // Not one of this business's offers: ignored.
      [offerFieldName(offerB, "title")]: "Heb ei ganiatáu",
    };
    const parsed = parseTranslationForm((name) => fields[name], [], [offerA]);
    expect(parsed).toEqual({
      ok: true,
      value: {
        events: {},
        menuGroups: {},
        menuItems: {},
        summary: null,
        description: null,
        services: {},
        offers: {
          [offerA]: {
            title: "Gostyngiad gaeaf",
            description: "Deg y cant i ffwrdd",
          },
        },
      },
    });
  });

  it("refuses over-long offer text instead of cutting it", () => {
    const fields: Record<string, string> = {
      [offerFieldName(offerA, "title")]: "a".repeat(
        translationLimits.offerTitle + 1,
      ),
      [offerFieldName(offerA, "description")]: "b".repeat(
        translationLimits.offerDescription + 1,
      ),
    };
    const parsed = parseTranslationForm((name) => fields[name], [], [offerA]);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.offers[offerA]).toEqual({
        title: "too-long",
        description: "too-long",
      });
    }
  });

  it("overlays Welsh per field and flags exactly what is Welsh", () => {
    const offers = [
      { id: offerA, title: "Winter discount", description: "Ten percent off" },
      { id: offerB, title: "Free quote", description: "No obligation" },
    ];
    const result = applyOfferWelshOverlay(offers, {
      offers: {
        [offerA]: { title: "Gostyngiad gaeaf", description: null },
      },
    });
    expect(result).toEqual([
      {
        id: offerA,
        title: "Gostyngiad gaeaf",
        description: "Ten percent off",
        welshTitle: true,
        welshDescription: false,
      },
      {
        ...offers[1],
        welshTitle: false,
        welshDescription: false,
      },
    ]);
  });

  it("counts an offer done only when both title and description are Welsh", () => {
    const english = {
      summary: null,
      description: null,
      services: [],
      offers: [{ id: offerA, title: "Winter discount" }],
    };
    expect(
      welshCoverage(english, {
        ...emptyTranslation,
        offers: { [offerA]: { title: "Gaeaf", description: null } },
      }).state,
    ).toBe("none");
    expect(
      welshCoverage(english, {
        ...emptyTranslation,
        offers: { [offerA]: { title: "Gaeaf", description: "Deg y cant" } },
      }).state,
    ).toBe("complete");
  });
});

describe("event and menu translation", () => {
  const eventA = "00000000-0000-4000-8000-0000000000e1";
  const eventB = "00000000-0000-4000-8000-0000000000e2";
  const groupA = "00000000-0000-4000-8000-0000000000c1";
  const itemA = "00000000-0000-4000-8000-0000000000d1";
  const itemB = "00000000-0000-4000-8000-0000000000d2";

  it("reads event and menu fields only for the ids it is given", () => {
    const form: Record<string, string> = {
      [entryFieldName("event", eventA, "title")]: "  Noson  gwis ",
      [entryFieldName("event", eventA, "description")]: "Pob nos Fawrth",
      [entryFieldName("menuGroup", groupA, "name")]: "Prif brydau",
      [entryFieldName("menuItem", itemA, "name")]: "Cawl",
      [entryFieldName("menuItem", itemA, "description")]: "   ",
      // A forged field for an id the caller did not offer is never read.
      [entryFieldName("event", eventB, "title")]: "Ymosodiad",
      [entryFieldName("menuItem", itemB, "name")]: "Ymosodiad",
    };
    const parsed = parseTranslationForm((name) => form[name], [], [], {
      eventIds: [eventA],
      menuGroupIds: [groupA],
      menuItemIds: [itemA],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.events).toEqual({
      [eventA]: { title: "Noson gwis", description: "Pob nos Fawrth" },
    });
    expect(parsed.value.menuGroups).toEqual({
      [groupA]: { name: "Prif brydau", description: null },
    });
    expect(parsed.value.menuItems).toEqual({
      [itemA]: { name: "Cawl", description: null },
    });
  });

  it("refuses over-long event and menu text per field instead of cutting it", () => {
    const titleField = entryFieldName("event", eventA, "title");
    const itemField = entryFieldName("menuItem", itemA, "description");
    const parsed = parseTranslationForm(
      (name) =>
        name === titleField
          ? "a".repeat(entryLimits.event.headline + 1)
          : name === itemField
            ? "b".repeat(entryLimits.menuItem.description + 1)
            : "",
      [],
      [],
      { eventIds: [eventA], menuItemIds: [itemA] },
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.entries).toEqual({
      [titleField]: "too-long",
      [itemField]: "too-long",
    });
  });

  it("leaves events and menu out of the result when no ids are offered", () => {
    const parsed = parseTranslationForm(() => "x", [], []);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.events).toEqual({});
    expect(parsed.value.menuGroups).toEqual({});
    expect(parsed.value.menuItems).toEqual({});
  });

  it("lays Welsh over events field by field and flags only the Welsh ones", () => {
    const events = [
      { id: eventA, title: "Quiz night", description: "Every Tuesday" },
      { id: eventB, title: "Choir", description: "Weekly rehearsal" },
    ];
    const result = applyEventWelshOverlay(events, {
      events: { [eventA]: { title: "Noson gwis", description: null } },
    });
    expect(result[0]).toMatchObject({
      title: "Noson gwis",
      description: "Every Tuesday",
      welshTitle: true,
      welshDescription: false,
    });
    expect(result[1]).toMatchObject({
      title: "Choir",
      welshTitle: false,
      welshDescription: false,
    });
  });

  it("lays Welsh over a menu without touching prices, labels or availability", () => {
    const groups = [
      {
        id: groupA,
        name: "Mains",
        description: null,
        status: "active",
        items: [
          {
            id: itemA,
            name: "Stew",
            description: "Slow cooked",
            priceDisplay: "£9",
            dietaryLabels: ["gluten-free"],
            available: false,
            featured: true,
          },
          {
            id: itemB,
            name: "Pie",
            description: null,
            priceDisplay: null,
            dietaryLabels: [],
            available: true,
            featured: false,
          },
        ],
      },
    ];
    const [group] = applyMenuWelshOverlay(groups, {
      menuGroups: { [groupA]: { name: "Prif brydau", description: null } },
      menuItems: { [itemA]: { name: "Cawl", description: null } },
    });
    expect(group).toMatchObject({
      name: "Prif brydau",
      welshName: true,
      welshDescription: false,
      status: "active",
    });
    expect(group?.items[0]).toMatchObject({
      name: "Cawl",
      description: "Slow cooked",
      priceDisplay: "£9",
      dietaryLabels: ["gluten-free"],
      available: false,
      featured: true,
      welshName: true,
      welshDescription: false,
    });
    expect(group?.items[1]).toMatchObject({
      name: "Pie",
      welshName: false,
    });
  });

  it("counts events and menu entries in the Welsh progress", () => {
    const english = {
      summary: null,
      description: null,
      services: [],
      events: [{ id: eventA, title: "Quiz night" }],
      menuGroups: [{ id: groupA, name: "Mains" }],
      menuItems: [{ id: itemA, name: "Stew" }],
    };
    expect(welshCoverage(english, emptyTranslation).total).toBe(3);
    const partial = welshCoverage(english, {
      ...emptyTranslation,
      events: { [eventA]: { title: "Noson gwis", description: "Nos Fawrth" } },
      menuItems: { [itemA]: { name: "Cawl", description: null } },
    });
    expect(partial.done).toBe(2);
    expect(partial.state).toBe("partial");
    // An event needs both title and description, a menu entry only its name.
    expect(
      welshCoverage(english, {
        ...emptyTranslation,
        events: { [eventA]: { title: "Noson gwis", description: null } },
      }).done,
    ).toBe(0);
  });
});
