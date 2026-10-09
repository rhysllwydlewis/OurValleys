import { describe, expect, it } from "vitest";
import {
  accentName,
  attributeCopy,
  layoutName,
  memberRoleTag,
  onboardingStepCopy,
  onboardingStepTitle,
  previewStepCopy,
  publicationGuidanceCopy,
  sectionLabel,
  templateCopy,
  weekdayKeys,
  weekdayLabel,
} from "@/lib/i18n/business-copy";
import { translatorFor } from "@/lib/i18n/translate";
import {
  businessAccents,
  businessSections,
  businessTemplates,
} from "@/modules/businesses/appearance";
import { businessAttributeDefinitions } from "@/modules/businesses/attribute-definitions";
import {
  businessOnboardingSteps,
  describePreviewStep,
} from "@/modules/businesses/onboarding";
import { getPublicationGuidance } from "@/modules/businesses/publication-guidance";

const en = translatorFor("en");
const cy = translatorFor("cy");

/**
 * The English wording lives next to the rules that use it, and the catalogue
 * repeats it so it can be translated. These tests stop the two drifting apart,
 * and stop a Welsh entry being left as a copy of the English one.
 */
describe("owner dashboard copy catalogue", () => {
  it("matches the checklist steps and translates every one", () => {
    for (const step of businessOnboardingSteps) {
      expect(onboardingStepCopy(en, step.key)).toEqual({
        title: step.title,
        description: step.description,
      });
      const welsh = onboardingStepCopy(cy, step.key);
      expect(welsh.title).not.toBe(step.title);
      expect(welsh.description).not.toBe(step.description);
    }
  });

  it("names missing steps by title and leaves unknown keys alone", () => {
    expect(onboardingStepTitle(en, "location")).toBe(
      "Location and service area",
    );
    expect(onboardingStepTitle(cy, "location")).toBe(
      "Lleoliad ac ardal wasanaeth",
    );
    expect(onboardingStepTitle(cy, "something-new")).toBe("something-new");
  });

  it("matches the publication guidance for every status", () => {
    for (const status of [
      "draft",
      "pending_review",
      "published",
      "rejected",
      "suspended",
    ]) {
      const source = getPublicationGuidance(status);
      expect(publicationGuidanceCopy(en, status, source)).toEqual(source);
      const welsh = publicationGuidanceCopy(cy, status, source);
      expect(welsh.chip).toBe(source.chip);
      expect(welsh.canSubmit).toBe(source.canSubmit);
      for (const field of [
        "label",
        "description",
        "visibility",
        "nextAction",
        "rollback",
      ] as const) {
        expect(welsh[field]).not.toBe(source[field]);
      }
    }
  });

  it("falls back to the draft wording for an unknown status, as the source does", () => {
    const source = getPublicationGuidance("not-a-status");
    expect(publicationGuidanceCopy(en, "not-a-status", source)).toEqual(source);
  });

  it("matches the preview step wording for every variant", () => {
    const cases = [
      describePreviewStep([], {}),
      describePreviewStep(["profile", "location"], {}),
      describePreviewStep([], { published: true }),
    ];
    expect(new Set(cases.map((step) => step.variant)).size).toBe(3);
    for (const step of cases) {
      expect(previewStepCopy(en, step)).toEqual({
        label: step.label,
        note: step.note,
      });
      expect(previewStepCopy(cy, step).note).not.toBe(step.note);
    }
  });

  it("matches every business attribute", () => {
    for (const definition of businessAttributeDefinitions) {
      expect(attributeCopy(en, definition.key)).toEqual({
        label: definition.label,
        description: definition.description,
      });
      expect(attributeCopy(cy, definition.key).label).not.toBe(
        definition.label,
      );
    }
  });

  it("translates weekdays and member roles, passing unknown values through", () => {
    expect(weekdayKeys.map((day) => weekdayLabel(en, day))).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    expect(weekdayLabel(cy, "monday")).toBe("Dydd Llun");
    expect(weekdayLabel(cy, "funday")).toBe("funday");
    expect(memberRoleTag(en, "owner")).toBe("owner");
    expect(memberRoleTag(cy, "owner")).toBe("perchennog");
    expect(memberRoleTag(cy, "steward")).toBe("steward");
  });

  it("matches the website design names and translates every one", () => {
    for (const template of businessTemplates) {
      expect(templateCopy(en, template.key)).toEqual({
        name: template.name,
        description: template.description,
      });
      const welsh = templateCopy(cy, template.key);
      expect(welsh.name).not.toBe(template.name);
      expect(welsh.description).not.toBe(template.description);
    }
    for (const accent of businessAccents) {
      expect(accentName(en, accent.key)).toBe(accent.name);
      expect(accentName(cy, accent.key)).not.toBe(accent.name);
    }
    for (const section of businessSections) {
      expect(sectionLabel(en, section.id)).toBe(section.label);
      expect(sectionLabel(cy, section.id)).not.toBe(section.label);
      for (const layout of section.layouts) {
        expect(layoutName(en, section.id, layout.key)).toBe(layout.name);
        expect(layoutName(cy, section.id, layout.key)).not.toBe(layout.name);
      }
    }
    expect(layoutName(cy, "about", "not-a-layout")).toBe("not-a-layout");
  });
});
