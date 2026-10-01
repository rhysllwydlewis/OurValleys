import type { PlaceSeed } from "./place-seed";

/**
 * Merthyr Tydfil county borough geography, added as part of the wider South
 * Wales Valleys expansion. All records start at `planned` coverage: no
 * business density exists here yet, so no stronger coverage claim is made.
 */
export const merthyrTydfilPlaces = [
  {
    slug: "merthyr-tydfil",
    canonicalName: "Merthyr Tydfil County Borough",
    welshName: "Bwrdeistref Sirol Merthyr Tudful",
    placeType: "region",
    coverageStatus: "planned",
    editorialSummary:
      "Merthyr Tydfil and the surrounding communities, part of the wider South Wales Valleys expansion.",
    latitude: 51.749,
    longitude: -3.377,
    parentSlug: null,
    aliases: [
      { label: "Merthyr", language: "en" },
      { label: "Merthyr Tydfil", language: "en" },
    ],
  },
  {
    slug: "merthyr-tydfil-town",
    canonicalName: "Merthyr Tydfil",
    welshName: "Merthyr Tudful",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "The principal town of the county borough, with a historic ironworks heritage and a developing local business base.",
    latitude: 51.749,
    longitude: -3.377,
    parentSlug: "merthyr-tydfil",
    aliases: [],
  },
  {
    slug: "treharris",
    canonicalName: "Treharris",
    welshName: "Treharris",
    placeType: "town",
    coverageStatus: "planned",
    editorialSummary:
      "A former colliery town in the south of the county borough, close to the Taff Bargoed valley.",
    latitude: 51.658,
    longitude: -3.297,
    parentSlug: "merthyr-tydfil",
    aliases: [],
  },
  {
    slug: "troedyrhiw",
    canonicalName: "Troedyrhiw",
    welshName: "Troedyrhiw",
    placeType: "village",
    coverageStatus: "planned",
    editorialSummary:
      "A Taff-side community between Merthyr Tydfil and Aberfan.",
    latitude: 51.724,
    longitude: -3.371,
    parentSlug: "merthyr-tydfil",
    aliases: [],
  },
  {
    slug: "dowlais",
    canonicalName: "Dowlais",
    welshName: "Dowlais",
    placeType: "neighbourhood",
    coverageStatus: "planned",
    editorialSummary:
      "A historic ironworking community on the northern edge of Merthyr Tydfil town.",
    latitude: 51.76,
    longitude: -3.36,
    parentSlug: "merthyr-tydfil-town",
    aliases: [],
  },
  {
    slug: "aberfan",
    canonicalName: "Aberfan",
    welshName: "Aberfan",
    placeType: "village",
    coverageStatus: "planned",
    editorialSummary:
      "A close-knit community on the River Taff south of Merthyr Tydfil town.",
    latitude: 51.714,
    longitude: -3.35,
    parentSlug: "merthyr-tydfil",
    aliases: [],
  },
  {
    slug: "bedlinog",
    canonicalName: "Bedlinog",
    welshName: "Bedlinog",
    placeType: "village",
    coverageStatus: "planned",
    editorialSummary:
      "A hillside village near the county borough's southern boundary with Caerphilly.",
    latitude: 51.685,
    longitude: -3.295,
    parentSlug: "merthyr-tydfil",
    aliases: [],
  },
] as const satisfies readonly PlaceSeed[];
