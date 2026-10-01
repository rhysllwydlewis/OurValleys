export type PlaceCoverageStatus = "planned" | "seeding" | "pilot" | "active";

export type PlaceSeed = {
  slug: string;
  canonicalName: string;
  welshName: string | null;
  placeType: "region" | "valley" | "town" | "village" | "neighbourhood";
  coverageStatus: PlaceCoverageStatus;
  editorialSummary: string;
  latitude: number | null;
  longitude: number | null;
  parentSlug: string | null;
  aliases: readonly { label: string; language: "en" | "cy" }[];
};
