import type { PlaceSeed } from "./place-seed";

/**
 * Caerphilly county borough geography, added as part of the wider South
 * Wales Valleys expansion. All records start at `planned` coverage: no
 * business density exists here yet, so no stronger coverage claim is made.
 */
export const caerphillyPlaces = [
  {
    slug: "caerphilly",
    canonicalName: "Caerphilly County Borough",
    welshName: "Bwrdeistref Sirol Caerffili",
    placeType: "region",
    coverageStatus: "planned",
    editorialSummary:
      "The Rhymney, Aber and part of the Sirhowy valleys, part of the wider South Wales Valleys expansion.",
    latitude: 51.578,
    longitude: -3.22,
    parentSlug: null,
    aliases: [
      { label: "Caerffili", language: "cy" },
      { label: "Caerphilly", language: "en" },
    ],
  },
  {
    slug: "rhymney-valley",
    canonicalName: "Rhymney Valley",
    welshName: "Cwm Rhymni",
    placeType: "valley",
    coverageStatus: "planned",
    editorialSummary:
      "Communities along the Rhymney from Ystrad Mynach and Bargoed up to Rhymney itself.",
    latitude: 51.71,
    longitude: -3.26,
    parentSlug: "caerphilly",
    aliases: [{ label: "Cwm Rhymni", language: "cy" }],
  },
  {
    slug: "aber-valley",
    canonicalName: "Aber Valley",
    welshName: "Cwm Aber",
    placeType: "valley",
    coverageStatus: "planned",
    editorialSummary:
      "A small valley around Senghenydd and Abertridwr, running north from Caerphilly town.",
    latitude: 51.605,
    longitude: -3.271,
    parentSlug: "caerphilly",
    aliases: [{ label: "Cwm Aber", language: "cy" }],
  },
  {
    slug: "sirhowy-valley-caerphilly",
    canonicalName: "Lower Sirhowy Valley",
    welshName: "Cwm Sirhywi",
    placeType: "valley",
    coverageStatus: "planned",
    editorialSummary:
      "The lower Sirhowy valley communities of Risca, Newbridge and Blackwood, within the Caerphilly county borough.",
    latitude: 51.65,
    longitude: -3.15,
    parentSlug: "caerphilly",
    aliases: [{ label: "Cwm Sirhywi", language: "cy" }],
  },
  {
    slug: "caerphilly-town",
    canonicalName: "Caerphilly",
    welshName: "Caerffili",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "The county borough's main town, known for its castle and its position between the Rhymney and Aber valleys.",
    latitude: 51.578,
    longitude: -3.22,
    parentSlug: "caerphilly",
    aliases: [{ label: "Caerffili", language: "cy" }],
  },
  {
    slug: "bargoed",
    canonicalName: "Bargoed",
    welshName: "Bargod",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "A former colliery town serving the central Rhymney valley.",
    latitude: 51.694,
    longitude: -3.245,
    parentSlug: "rhymney-valley",
    aliases: [{ label: "Bargod", language: "cy" }],
  },
  {
    slug: "rhymney",
    canonicalName: "Rhymney",
    welshName: "Rhymni",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "A town at the head of the Rhymney valley, close to the border with Caerphilly's neighbouring boroughs.",
    latitude: 51.761,
    longitude: -3.288,
    parentSlug: "rhymney-valley",
    aliases: [{ label: "Rhymni", language: "cy" }],
  },
  {
    slug: "ystrad-mynach",
    canonicalName: "Ystrad Mynach",
    welshName: "Ystrad Mynach",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "A well-connected town in the lower Rhymney valley with shops, services and transport links.",
    latitude: 51.649,
    longitude: -3.24,
    parentSlug: "rhymney-valley",
    aliases: [],
  },
  {
    slug: "senghenydd",
    canonicalName: "Senghenydd",
    welshName: "Senghennydd",
    placeType: "village",
    coverageStatus: "planned",
    editorialSummary:
      "A historic mining village at the head of the Aber valley.",
    latitude: 51.61,
    longitude: -3.271,
    parentSlug: "aber-valley",
    aliases: [{ label: "Senghennydd", language: "cy" }],
  },
  {
    slug: "blackwood",
    canonicalName: "Blackwood",
    welshName: "Coed-duon",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "A busy town in the lower Sirhowy valley with a well-used high street.",
    latitude: 51.669,
    longitude: -3.196,
    parentSlug: "sirhowy-valley-caerphilly",
    aliases: [{ label: "Coed-duon", language: "cy" }],
  },
  {
    slug: "risca",
    canonicalName: "Risca",
    welshName: "Rhisga",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary: "A Sirhowy valley town near the boundary with Newport.",
    latitude: 51.608,
    longitude: -3.091,
    parentSlug: "sirhowy-valley-caerphilly",
    aliases: [{ label: "Rhisga", language: "cy" }],
  },
] as const satisfies readonly PlaceSeed[];
