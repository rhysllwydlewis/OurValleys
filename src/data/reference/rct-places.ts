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

/**
 * Initial machine-readable RCT geography for product development and controlled
 * pilot preparation. Coordinates are locality centroids, not address data.
 * The dataset remains versioned and reviewable so Welsh names, aliases,
 * hierarchy and coverage decisions can be corrected without code changes.
 */
export const rctPlaces = [
  {
    slug: "rhondda-cynon-taf",
    canonicalName: "Rhondda Cynon Taf",
    welshName: "Rhondda Cynon Taf",
    placeType: "region",
    coverageStatus: "seeding",
    editorialSummary:
      "The initial OurValleys coverage area, connecting communities across the Rhondda, Cynon, Taff and Ely valleys.",
    latitude: 51.649,
    longitude: -3.409,
    parentSlug: null,
    aliases: [
      { label: "RCT", language: "en" },
      { label: "Rhondda Cynon Taff", language: "en" },
    ],
  },
  {
    slug: "rhondda-fawr",
    canonicalName: "Rhondda Fawr",
    welshName: "Rhondda Fawr",
    placeType: "valley",
    coverageStatus: "seeding",
    editorialSummary:
      "The larger Rhondda valley, including Treorchy, Tonypandy and neighbouring communities.",
    latitude: 51.659,
    longitude: -3.505,
    parentSlug: "rhondda-cynon-taf",
    aliases: [{ label: "Upper Rhondda", language: "en" }],
  },
  {
    slug: "rhondda-fach",
    canonicalName: "Rhondda Fach",
    welshName: "Rhondda Fach",
    placeType: "valley",
    coverageStatus: "seeding",
    editorialSummary:
      "The Rhondda Fach valley, including Ferndale, Maerdy, Tylorstown and Ynyshir.",
    latitude: 51.679,
    longitude: -3.448,
    parentSlug: "rhondda-cynon-taf",
    aliases: [{ label: "Little Rhondda", language: "en" }],
  },
  {
    slug: "cynon-valley",
    canonicalName: "Cynon Valley",
    welshName: "Cwm Cynon",
    placeType: "valley",
    coverageStatus: "seeding",
    editorialSummary:
      "Communities along the Cynon, from Abercynon and Mountain Ash to Aberdare and Hirwaun.",
    latitude: 51.689,
    longitude: -3.43,
    parentSlug: "rhondda-cynon-taf",
    aliases: [{ label: "Cwm Cynon", language: "cy" }],
  },
  {
    slug: "taff-valley",
    canonicalName: "Taff Valley",
    welshName: "Cwm Taf",
    placeType: "valley",
    coverageStatus: "seeding",
    editorialSummary:
      "The Taff-side communities around Pontypridd, Treforest, Rhydyfelin and Taff's Well.",
    latitude: 51.599,
    longitude: -3.335,
    parentSlug: "rhondda-cynon-taf",
    aliases: [{ label: "Cwm Taf", language: "cy" }],
  },
  {
    slug: "ely-valley",
    canonicalName: "Ely Valley",
    welshName: "Cwm Elái",
    placeType: "valley",
    coverageStatus: "seeding",
    editorialSummary:
      "Western RCT communities around Tonyrefail, Llantrisant, Talbot Green and Church Village.",
    latitude: 51.583,
    longitude: -3.433,
    parentSlug: "rhondda-cynon-taf",
    aliases: [{ label: "Cwm Elai", language: "cy" }],
  },
  {
    slug: "aberdare",
    canonicalName: "Aberdare",
    welshName: "Aberdâr",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "A principal Cynon Valley town with a broad mix of independent businesses, services and cultural venues.",
    latitude: 51.713,
    longitude: -3.445,
    parentSlug: "cynon-valley",
    aliases: [{ label: "Aberdar", language: "cy" }],
  },
  {
    slug: "mountain-ash",
    canonicalName: "Mountain Ash",
    welshName: "Aberpennar",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "A Cynon Valley town connecting nearby communities and local services around the river and railway corridor.",
    latitude: 51.681,
    longitude: -3.38,
    parentSlug: "cynon-valley",
    aliases: [{ label: "Aberpennar", language: "cy" }],
  },
  {
    slug: "hirwaun",
    canonicalName: "Hirwaun",
    welshName: "Hirwaun",
    placeType: "village",
    coverageStatus: "seeding",
    editorialSummary:
      "A community at the upper end of the Cynon Valley, close to countryside, employment and visitor routes.",
    latitude: 51.739,
    longitude: -3.511,
    parentSlug: "cynon-valley",
    aliases: [],
  },
  {
    slug: "abercynon",
    canonicalName: "Abercynon",
    welshName: "Abercynon",
    placeType: "village",
    coverageStatus: "seeding",
    editorialSummary:
      "A well-connected community where the Cynon and Taff corridors meet.",
    latitude: 51.645,
    longitude: -3.327,
    parentSlug: "cynon-valley",
    aliases: [],
  },
  {
    slug: "treorchy",
    canonicalName: "Treorchy",
    welshName: "Treorci",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "An upper Rhondda town known for its high street, community life and access to the surrounding landscape.",
    latitude: 51.659,
    longitude: -3.506,
    parentSlug: "rhondda-fawr",
    aliases: [{ label: "Treorci", language: "cy" }],
  },
  {
    slug: "tonypandy",
    canonicalName: "Tonypandy",
    welshName: "Tonypandy",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "A central Rhondda town and service hub with strong links to neighbouring valley communities.",
    latitude: 51.622,
    longitude: -3.455,
    parentSlug: "rhondda-fawr",
    aliases: [],
  },
  {
    slug: "porth",
    canonicalName: "Porth",
    welshName: "Porth",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "A gateway between the Rhondda valleys and Pontypridd, serving several surrounding communities.",
    latitude: 51.613,
    longitude: -3.408,
    parentSlug: "rhondda-fawr",
    aliases: [],
  },
  {
    slug: "llwynypia",
    canonicalName: "Llwynypia",
    welshName: "Llwynypia",
    placeType: "village",
    coverageStatus: "seeding",
    editorialSummary:
      "A Rhondda Fawr community between Tonypandy and the upper valley.",
    latitude: 51.633,
    longitude: -3.453,
    parentSlug: "rhondda-fawr",
    aliases: [],
  },
  {
    slug: "penygraig",
    canonicalName: "Penygraig",
    welshName: "Pen-y-graig",
    placeType: "village",
    coverageStatus: "seeding",
    editorialSummary:
      "A hillside Rhondda community with local shops, services and links into Tonypandy and Porth.",
    latitude: 51.615,
    longitude: -3.449,
    parentSlug: "rhondda-fawr",
    aliases: [{ label: "Pen-y-graig", language: "cy" }],
  },
  {
    slug: "ferndale",
    canonicalName: "Ferndale",
    welshName: "Glynrhedynog",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "A Rhondda Fach town serving nearby communities through local shops, services and community organisations.",
    latitude: 51.661,
    longitude: -3.448,
    parentSlug: "rhondda-fach",
    aliases: [{ label: "Glynrhedynog", language: "cy" }],
  },
  {
    slug: "maerdy",
    canonicalName: "Maerdy",
    welshName: "Y Maerdy",
    placeType: "village",
    coverageStatus: "seeding",
    editorialSummary:
      "An upper Rhondda Fach community with direct access to the surrounding mountains and trails.",
    latitude: 51.675,
    longitude: -3.487,
    parentSlug: "rhondda-fach",
    aliases: [{ label: "Y Maerdy", language: "cy" }],
  },
  {
    slug: "tylorstown",
    canonicalName: "Tylorstown",
    welshName: "Pendyrus",
    placeType: "village",
    coverageStatus: "seeding",
    editorialSummary:
      "A Rhondda Fach community between Ferndale and Porth with a distinct local centre.",
    latitude: 51.647,
    longitude: -3.434,
    parentSlug: "rhondda-fach",
    aliases: [{ label: "Pendyrus", language: "cy" }],
  },
  {
    slug: "pontypridd",
    canonicalName: "Pontypridd",
    welshName: "Pontypridd",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "A major RCT town and transport hub with independent businesses, education, markets and cultural venues.",
    latitude: 51.602,
    longitude: -3.342,
    parentSlug: "taff-valley",
    aliases: [{ label: "Ponty", language: "en" }],
  },
  {
    slug: "treforest",
    canonicalName: "Treforest",
    welshName: "Trefforest",
    placeType: "village",
    coverageStatus: "seeding",
    editorialSummary:
      "A Taff Valley community adjoining Pontypridd, with residential, university and business areas.",
    latitude: 51.589,
    longitude: -3.326,
    parentSlug: "taff-valley",
    aliases: [{ label: "Trefforest", language: "cy" }],
  },
  {
    slug: "rhydyfelin",
    canonicalName: "Rhydyfelin",
    welshName: "Rhydyfelin",
    placeType: "village",
    coverageStatus: "seeding",
    editorialSummary:
      "A residential Taff Valley community between Pontypridd and Cardiff.",
    latitude: 51.585,
    longitude: -3.315,
    parentSlug: "taff-valley",
    aliases: [],
  },
  {
    slug: "tonyrefail",
    canonicalName: "Tonyrefail",
    welshName: "Tonyrefail",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "An Ely Valley town serving surrounding villages and rural communities in western RCT.",
    latitude: 51.584,
    longitude: -3.43,
    parentSlug: "ely-valley",
    aliases: [],
  },
  {
    slug: "llantrisant",
    canonicalName: "Llantrisant",
    welshName: "Llantrisant",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "A historic hilltop town with a traditional centre and strong links to the wider Ely Valley area.",
    latitude: 51.541,
    longitude: -3.374,
    parentSlug: "ely-valley",
    aliases: [],
  },
  {
    slug: "talbot-green",
    canonicalName: "Talbot Green",
    welshName: "Tonysguboriau",
    placeType: "town",
    coverageStatus: "seeding",
    editorialSummary:
      "A major retail and service centre for western RCT and nearby communities.",
    latitude: 51.537,
    longitude: -3.389,
    parentSlug: "ely-valley",
    aliases: [{ label: "Tonysguboriau", language: "cy" }],
  },
  {
    slug: "church-village",
    canonicalName: "Church Village",
    welshName: "Pentre'r Eglwys",
    placeType: "village",
    coverageStatus: "seeding",
    editorialSummary:
      "A growing residential community near Pontypridd, Llantrisant and the A470 corridor.",
    latitude: 51.568,
    longitude: -3.321,
    parentSlug: "ely-valley",
    aliases: [{ label: "Pentre'r Eglwys", language: "cy" }],
  },
] as const satisfies readonly PlaceSeed[];
