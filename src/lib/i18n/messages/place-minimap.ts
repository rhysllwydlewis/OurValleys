/**
 * Strings for the place-page mini-map and the valley-at-a-glance panel.
 * Welsh is first-draft and needs review by a fluent Welsh speaker.
 */
export const placeMiniMapEn = {
  "minimap.eyebrow": "Where it is",
  "minimap.title": "{place} in {valley}",
  "minimap.titleValley": "{valley} at a glance",
  "minimap.note":
    "The valley's river with its towns and villages. A numbered marker shows how many local businesses a place has.",
  "minimap.mapLabel": "Map of places in {valley}",
  "minimap.dotLabelOne": "{place}: 1 local business",
  "minimap.dotLabelMany": "{place}: {count} local businesses",
  "minimap.dotLabelNone": "{place}: no listed businesses yet",
  "minimap.thisPlace": "You are here",
  "minimap.openMap": "Open the valley on the map",
  "minimap.glanceTitle": "Where the businesses are",
  "minimap.glanceBusinessOne": "1 business",
  "minimap.glanceBusinessMany": "{count} businesses",
  "minimap.glanceNone": "None listed yet",
  "minimap.categoriesTitle": "Most common here",
  "minimap.summary": "Places: {places} · Listed businesses: {businesses}",
} as const;

export const placeMiniMapCy: Record<keyof typeof placeMiniMapEn, string> = {
  "minimap.eyebrow": "Ble mae",
  "minimap.title": "{place} yn {valley}",
  "minimap.titleValley": "{valley} ar un olwg",
  "minimap.note":
    "Afon y cwm gyda'i threfi a'i phentrefi. Mae marciwr â rhif yn dangos faint o fusnesau lleol sydd gan le.",
  "minimap.mapLabel": "Map o'r lleoedd yn {valley}",
  "minimap.dotLabelOne": "{place}: 1 busnes lleol",
  "minimap.dotLabelMany": "{place}: {count} busnes lleol",
  "minimap.dotLabelNone": "{place}: dim busnesau wedi'u rhestru eto",
  "minimap.thisPlace": "Rydych chi yma",
  "minimap.openMap": "Agor y cwm ar y map",
  "minimap.glanceTitle": "Ble mae'r busnesau",
  "minimap.glanceBusinessOne": "1 busnes",
  "minimap.glanceBusinessMany": "{count} busnes",
  "minimap.glanceNone": "Dim wedi'u rhestru eto",
  "minimap.categoriesTitle": "Y mwyaf cyffredin yma",
  "minimap.summary":
    "Lleoedd: {places} · Busnesau wedi'u rhestru: {businesses}",
};
