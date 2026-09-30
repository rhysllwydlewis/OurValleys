import type { PlaceSeed } from "./place-seed";

/**
 * Blaenau Gwent county borough geography, added as part of the wider South
 * Wales Valleys expansion. All records start at `planned` coverage: no
 * business density exists here yet, so no stronger coverage claim is made.
 */
export const blaenauGwentPlaces = [
  {
    slug: "blaenau-gwent",
    canonicalName: "Blaenau Gwent",
    welshName: "Blaenau Gwent",
    placeType: "region",
    coverageStatus: "planned",
    editorialSummary:
      "The Ebbw, Ebbw Fach and upper Sirhowy valleys, part of the wider South Wales Valleys expansion.",
    latitude: 51.77,
    longitude: -3.17,
    parentSlug: null,
    aliases: [],
  },
  {
    slug: "ebbw-valley",
    canonicalName: "Ebbw Valley",
    welshName: "Cwm Ebwy",
    placeType: "valley",
    coverageStatus: "planned",
    editorialSummary:
      "The main Ebbw valley, home to Ebbw Vale, Cwm and Brynmawr.",
    latitude: 51.79,
    longitude: -3.2,
    parentSlug: "blaenau-gwent",
    aliases: [{ label: "Cwm Ebwy", language: "cy" }],
  },
  {
    slug: "ebbw-fach-valley",
    canonicalName: "Ebbw Fach Valley",
    welshName: "Cwm Ebwy Fach",
    placeType: "valley",
    coverageStatus: "planned",
    editorialSummary:
      "The Ebbw Fach valley running through Abertillery and Six Bells.",
    latitude: 51.716,
    longitude: -3.145,
    parentSlug: "blaenau-gwent",
    aliases: [{ label: "Cwm Ebwy Fach", language: "cy" }],
  },
  {
    slug: "upper-sirhowy-valley",
    canonicalName: "Upper Sirhowy Valley",
    welshName: "Cwm Sirhywi Uchaf",
    placeType: "valley",
    coverageStatus: "planned",
    editorialSummary:
      "The upper Sirhowy valley around Tredegar, at the head of the wider Sirhowy corridor.",
    latitude: 51.78,
    longitude: -3.1,
    parentSlug: "blaenau-gwent",
    aliases: [],
  },
  {
    slug: "ebbw-vale",
    canonicalName: "Ebbw Vale",
    welshName: "Glynebwy",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "The county borough's largest town, at the head of the Ebbw valley.",
    latitude: 51.782,
    longitude: -3.203,
    parentSlug: "ebbw-valley",
    aliases: [{ label: "Glynebwy", language: "cy" }],
  },
  {
    slug: "brynmawr",
    canonicalName: "Brynmawr",
    welshName: "Brynmawr",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "A hilltop town at the top of the Ebbw valley, close to the border with Powys.",
    latitude: 51.809,
    longitude: -3.18,
    parentSlug: "ebbw-valley",
    aliases: [],
  },
  {
    slug: "cwm",
    canonicalName: "Cwm",
    welshName: "Cwm",
    placeType: "village",
    coverageStatus: "planned",
    editorialSummary:
      "A village neighbouring Ebbw Vale in the main Ebbw valley.",
    latitude: 51.795,
    longitude: -3.174,
    parentSlug: "ebbw-valley",
    aliases: [],
  },
  {
    slug: "abertillery",
    canonicalName: "Abertillery",
    welshName: "Abertyleri",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary: "The principal town of the Ebbw Fach valley.",
    latitude: 51.716,
    longitude: -3.142,
    parentSlug: "ebbw-fach-valley",
    aliases: [{ label: "Abertyleri", language: "cy" }],
  },
  {
    slug: "tredegar",
    canonicalName: "Tredegar",
    welshName: "Tredegar",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "A historic ironworking town at the head of the Sirhowy valley.",
    latitude: 51.777,
    longitude: -3.246,
    parentSlug: "upper-sirhowy-valley",
    aliases: [],
  },
] as const satisfies readonly PlaceSeed[];
