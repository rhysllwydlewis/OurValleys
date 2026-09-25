import { blaenauGwentPlaces } from "./blaenau-gwent-places";
import { bridgendPlaces } from "./bridgend-places";
import { caerphillyPlaces } from "./caerphilly-places";
import { merthyrTydfilPlaces } from "./merthyr-tydfil-places";
import { neathPortTalbotPlaces } from "./neath-port-talbot-places";
import type { PlaceSeed } from "./place-seed";
import { rctPlaces } from "./rct-places";
import { torfaenPlaces } from "./torfaen-places";

/**
 * The combined place hierarchy for every South Wales Valleys council area
 * OurValleys plans to cover. Rhondda Cynon Taf remains the founding, most
 * developed area; the other six council areas start at `planned` coverage
 * until real business density is built there, per the product charter's
 * expansion rule (public coverage claims must match actual content density).
 */
export const valleysPlaces = [
  ...rctPlaces,
  ...merthyrTydfilPlaces,
  ...caerphillyPlaces,
  ...blaenauGwentPlaces,
  ...torfaenPlaces,
  ...bridgendPlaces,
  ...neathPortTalbotPlaces,
] as const satisfies readonly PlaceSeed[];

export type CouncilAreaSummary = {
  slug: string;
  name: string;
  welshName: string | null;
  description: string;
};

/**
 * The seven council areas that make up OurValleys' South Wales Valleys
 * coverage, for use in coverage-explaining copy (e.g. "which areas are
 * included?"). Descriptions name the valleys each area is known for rather
 * than claiming business density that does not exist yet.
 */
export const councilAreas: readonly CouncilAreaSummary[] = [
  {
    slug: "rhondda-cynon-taf",
    name: "Rhondda Cynon Taf",
    welshName: "Rhondda Cynon Taf",
    description: "The Rhondda, Cynon, Taff and Ely valleys.",
  },
  {
    slug: "merthyr-tydfil",
    name: "Merthyr Tydfil",
    welshName: "Merthyr Tudful",
    description: "Merthyr and the surrounding communities.",
  },
  {
    slug: "caerphilly",
    name: "Caerphilly",
    welshName: "Caerffili",
    description: "Rhymney, Aber and parts of the Sirhowy valleys.",
  },
  {
    slug: "blaenau-gwent",
    name: "Blaenau Gwent",
    welshName: "Blaenau Gwent",
    description: "Ebbw, Ebbw Fach and upper Sirhowy.",
  },
  {
    slug: "torfaen",
    name: "Torfaen",
    welshName: "Torfaen",
    description: "Blaenavon, Pontypool and the Llwyd Valley.",
  },
  {
    slug: "bridgend",
    name: "Bridgend",
    welshName: "Pen-y-bont ar Ogwr",
    description: "The Ogmore, Garw and Llynfi valleys.",
  },
  {
    slug: "neath-port-talbot",
    name: "Neath Port Talbot",
    welshName: "Castell-nedd Port Talbot",
    description: "The Afan, Neath and Dulais valleys.",
  },
];
