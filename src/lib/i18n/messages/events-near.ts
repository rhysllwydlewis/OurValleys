/**
 * Strings for "Near me" on the events page (doc 102): a distance filter and a
 * one-press shortcut. Spread into the main catalogues. Welsh is first-draft
 * and needs review by a fluent Welsh speaker before launch.
 */
export const eventsNearEn = {
  "eventsNear.legend": "Near a place",
  "eventsNear.hint": "Only show events hosted within a distance of a town.",
  "eventsNear.nearLabel": "Near",
  "eventsNear.withinLabel": "Within",
  "eventsNear.anyDistance": "Anywhere",
  "eventsNear.moreFilters": "Distance",
  "eventsNear.chip": "Near {value} (within {radius}km)",
  "eventsNear.remove": "Remove near {value} filter",
  "eventsNear.nearMeFound": "Showing events near {place}.",
  "eventsNear.nearMeDenied":
    "Location is turned off for this site. Choose a town under “Distance” instead.",
  "eventsNear.nearMeUnsupported":
    "This device cannot share its location. Choose a town under “Distance” instead.",
  "eventsNear.nearMeTimeout":
    "We could not find your location in time. Try again, or choose a town under “Distance”.",
  "eventsNear.nearMeOutside":
    "You appear to be outside the valleys. Choose a town under “Distance” to browse from there.",
  "eventsNear.emptyHint":
    "No events are hosted within {radius}km of {place}. Try a wider distance or remove the filter.",
} as const satisfies Record<string, string>;

export const eventsNearCy: Record<keyof typeof eventsNearEn, string> = {
  "eventsNear.legend": "Yn agos at le",
  "eventsNear.hint": "Dangos dim ond digwyddiadau o fewn pellter i dref.",
  "eventsNear.nearLabel": "Ger",
  "eventsNear.withinLabel": "O fewn",
  "eventsNear.anyDistance": "Unrhyw le",
  "eventsNear.moreFilters": "Pellter",
  "eventsNear.chip": "Ger {value} (o fewn {radius}km)",
  "eventsNear.remove": "Dileu’r hidlydd ger {value}",
  "eventsNear.nearMeFound": "Yn dangos digwyddiadau yn agos at {place}.",
  "eventsNear.nearMeDenied":
    "Mae lleoliad wedi’i ddiffodd ar gyfer y wefan hon. Dewiswch dref dan “Pellter” yn lle hynny.",
  "eventsNear.nearMeUnsupported":
    "Ni all y ddyfais hon rannu ei lleoliad. Dewiswch dref dan “Pellter” yn lle hynny.",
  "eventsNear.nearMeTimeout":
    "Ni fu modd dod o hyd i’ch lleoliad mewn pryd. Rhowch gynnig arall arni, neu dewiswch dref dan “Pellter”.",
  "eventsNear.nearMeOutside":
    "Mae’n ymddangos eich bod y tu allan i’r cymoedd. Dewiswch dref dan “Pellter” i bori oddi yno.",
  "eventsNear.emptyHint":
    "Nid oes digwyddiadau o fewn {radius}km i {place}. Rhowch gynnig ar bellter ehangach neu dilëwch yr hidlydd.",
} as const;
