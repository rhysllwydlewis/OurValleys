import {
  readinessLimits,
  type ReadinessCheck,
} from "@/modules/guides/guide-model";

/** What each readiness check asks of the editor, in the words the studio shows. */
export function readinessMessage(check: ReadinessCheck): {
  done: string;
  todo: string;
} {
  switch (check.key) {
    case "min_sections":
      return {
        done: `At least ${readinessLimits.minSections} sections`,
        todo: `Add sections: a guide needs at least ${readinessLimits.minSections}`,
      };
    case "summary_length":
      return {
        done: "Summary says enough about the guide",
        todo: `Write a summary of at least ${readinessLimits.minSummary} characters`,
      };
    case "has_link":
      return {
        done: "Links readers onward to the directory, events or a place",
        todo: "Link at least one section to a page on this site, such as /businesses",
      };
    case "review_date":
      return {
        done: "A review date is set",
        todo: "Set a review date in the future so the guide is checked again",
      };
    case "place_linked":
      return {
        done: "Linked to a place, so it appears on that place’s page",
        todo: "Link a place so the guide appears on its place page",
      };
    case "summary_search":
      return {
        done: "Summary is short enough for search results",
        todo: `Shorten the summary to ${readinessLimits.idealSummaryMax} characters or fewer so search results show all of it`,
      };
    case "thin_sections": {
      const numbers = (check.sections ?? []).join(", ");
      return {
        done: "Every section has some substance",
        todo: `${(check.sections ?? []).length === 1 ? "Section" : "Sections"} ${numbers} ${(check.sections ?? []).length === 1 ? "is" : "are"} very short: say more or merge`,
      };
    }
    case "tips_only":
      return {
        done: "Has ordinary sections as well as tips",
        todo: "Add at least one ordinary section: tips alone read as a list of asides",
      };
    case "reading_time":
      return {
        done: "Reading time matches the length",
        todo: "The reading time looks wrong for this length: use the suggestion",
      };
  }
}
