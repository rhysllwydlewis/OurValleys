import type { PlaceSeed } from "./place-seed";

/**
 * Torfaen county borough geography, added as part of the wider South Wales
 * Valleys expansion. All records start at `planned` coverage: no business
 * density exists here yet, so no stronger coverage claim is made.
 */
export const torfaenPlaces = [
  {
    slug: "torfaen",
    canonicalName: "Torfaen",
    welshName: "Torfaen",
    placeType: "region",
    coverageStatus: "planned",
    editorialSummary:
      "Blaenavon, Pontypool and the Llwyd Valley, part of the wider South Wales Valleys expansion.",
    latitude: 51.69,
    longitude: -3.05,
    parentSlug: null,
    aliases: [],
  },
  {
    slug: "llwyd-valley",
    canonicalName: "Llwyd Valley",
    welshName: "Cwm Lwyd",
    placeType: "valley",
    coverageStatus: "planned",
    editorialSummary:
      "The Afon Lwyd corridor connecting Pontypool, Cwmbran and the surrounding communities.",
    latitude: 51.7,
    longitude: -3.04,
    parentSlug: "torfaen",
    aliases: [{ label: "Cwm Lwyd", language: "cy" }],
  },
  {
    slug: "pontypool",
    canonicalName: "Pontypool",
    welshName: "Pont-y-pŵl",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "The county borough's traditional market town, at the heart of the Llwyd Valley.",
    latitude: 51.706,
    longitude: -3.038,
    parentSlug: "llwyd-valley",
    aliases: [{ label: "Pont-y-pŵl", language: "cy" }],
  },
  {
    slug: "cwmbran",
    canonicalName: "Cwmbran",
    welshName: "Cwmbrân",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "A new town and the county borough's largest population centre, in the south of the Llwyd Valley.",
    latitude: 51.653,
    longitude: -3.02,
    parentSlug: "llwyd-valley",
    aliases: [{ label: "Cwmbrân", language: "cy" }],
  },
  {
    slug: "blaenavon",
    canonicalName: "Blaenavon",
    welshName: "Blaenafon",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "A UNESCO World Heritage industrial town at the head of the valley, above Pontypool.",
    latitude: 51.774,
    longitude: -3.084,
    parentSlug: "torfaen",
    aliases: [{ label: "Blaenafon", language: "cy" }],
  },
  {
    slug: "griffithstown",
    canonicalName: "Griffithstown",
    welshName: "Treffynnon",
    placeType: "village",
    coverageStatus: "planned",
    editorialSummary: "A residential community between Pontypool and Cwmbran.",
    latitude: 51.685,
    longitude: -3.035,
    parentSlug: "llwyd-valley",
    aliases: [],
  },
] as const satisfies readonly PlaceSeed[];
